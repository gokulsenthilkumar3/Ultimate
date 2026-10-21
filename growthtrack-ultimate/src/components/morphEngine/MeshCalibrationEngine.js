/**
 * MeshCalibrationEngine.js
 * 
 * Replaces visual guesses with a constrained fitting process.
 * Evaluates the deformed mesh in a standardized neutral pose.
 * Transforms vertices into physical units before measuring.
 * Computes circumferences using closed cross-section loops.
 */

import { Vector3 } from 'three';

// Measurement landmarks as approximate Y-axis percentages (if vertex rings aren't provided in GLB metadata)
export const MEASUREMENT_LANDMARKS = {
  neck: { yPct: 0.85, axis: 'y' },
  chest: { yPct: 0.72, axis: 'y' },
  waist: { yPct: 0.58, axis: 'y' },
  hips: { yPct: 0.50, axis: 'y' },
  upperArm: { yPct: 0.65, axis: 'x', isLimb: true }, // rough approximation
  thigh: { yPct: 0.40, axis: 'y', isLimb: true },
  calf: { yPct: 0.20, axis: 'y', isLimb: true }
};

export class MeshCalibrationEngine {
  constructor(mesh, baseHeightCm = 175) {
    this.mesh = mesh;
    this.geometry = mesh.geometry;
    this.baseHeightCm = baseHeightCm;
    
    // Store original position data
    this.positions = this.geometry.attributes.position.array;
    this.vertexCount = this.positions.length / 3;
    
    // Morph targets
    this.morphAttributes = this.geometry.morphAttributes.position || [];
    this.morphDictionary = mesh.morphTargetDictionary || {};
    
    this.vertexRings = {};
    this.extractMeasurementRings();
  }

  /**
   * Pre-compute or extract vertex rings for circumferences.
   * In a production GLB, these should be stored in extras.measurementRings to guarantee stable topology.
   * Here we implement a fallback cross-section slicer.
   */
  extractMeasurementRings() {
    // If the GLB art pipeline provides the rings, use them:
    const extras = this.mesh.userData || {};
    if (extras.measurementRings) {
      this.vertexRings = extras.measurementRings;
      return;
    }
    
    // Fallback: This is a placeholder for actual cross-section logic.
    // True geometric slicing requires convex hull or nearest-neighbor contouring
    // which handles duplicated UV-seam vertices.
    console.warn("Mesh does not contain pre-defined measurement rings. Circumference math will be approximated.");
  }

  /**
   * Evaluates the deformed mesh vertices given a set of morph weights.
   */
  getDeformedVertices(weights) {
    const deformed = new Float32Array(this.positions.length);
    for (let i = 0; i < this.positions.length; i++) {
      deformed[i] = this.positions[i];
    }
    
    // Apply morph targets
    for (const morphName in weights) {
      const weight = weights[morphName];
      if (weight === 0) continue;
      
      const targetIndex = this.morphDictionary[morphName];
      if (targetIndex !== undefined && this.morphAttributes[targetIndex]) {
        const morphData = this.morphAttributes[targetIndex].array;
        for (let i = 0; i < deformed.length; i++) {
          deformed[i] += morphData[i] * weight;
        }
      }
    }
    return deformed;
  }

  /**
   * Computes circumferences of the mesh in its current deformed state.
   */
  computeCircumferences(deformedVertices, scaleCmPerUnit) {
    const results = {};
    const v1 = new Vector3();
    const v2 = new Vector3();

    for (const [measureName, ringIndices] of Object.entries(this.vertexRings)) {
      let circumference = 0;
      for (let i = 0; i < ringIndices.length; i++) {
        const idx1 = ringIndices[i] * 3;
        const idx2 = ringIndices[(i + 1) % ringIndices.length] * 3;
        
        v1.set(deformedVertices[idx1], deformedVertices[idx1+1], deformedVertices[idx1+2]);
        v2.set(deformedVertices[idx2], deformedVertices[idx2+1], deformedVertices[idx2+2]);
        
        circumference += v1.distanceTo(v2);
      }
      results[measureName] = circumference * scaleCmPerUnit;
    }
    return results;
  }

  /**
   * Computes the Jacobian matrix dynamically by perturbing each morph target.
   * jc[morphName][measureName] = change in cm per unit weight.
   */
  computeJacobian(cmPerUnit) {
    const jacobian = {};
    const baseVertices = this.getDeformedVertices({});
    const baseMeasures = this.computeCircumferences(baseVertices, cmPerUnit);
    this.neutralMeasures = baseMeasures;

    const delta = 0.5; // perturb by 50% weight for stability

    for (const morphName in this.morphDictionary) {
      jacobian[morphName] = {};
      const perturbedWeights = { [morphName]: delta };
      const perturbedVertices = this.getDeformedVertices(perturbedWeights);
      const perturbedMeasures = this.computeCircumferences(perturbedVertices, cmPerUnit);

      for (const measureName in baseMeasures) {
        const diff = perturbedMeasures[measureName] - baseMeasures[measureName];
        jacobian[morphName][measureName] = diff / delta;
      }
    }
    this.jacobian = jacobian;
    return jacobian;
  }

  /**
   * Bounded optimization solver to find the best morph weights that achieve target measurements.
   * Follows the projected coordinate descent method.
   */
  solveForMeasurements(targetMetrics, currentWeights = {}) {
    const result = {
      weights: { ...currentWeights },
      achieved: {},
      residuals: {},
      notes: [],
      calibrationStatus: 'uncalibrated'
    };
    
    // Ensure we have vertex rings to measure
    if (Object.keys(this.vertexRings).length === 0) {
      result.notes.push("No measurement rings available. Calibration skipped.");
      return result;
    }

    const heightCm = targetMetrics.height || this.baseHeightCm;
    
    // Get baseline bounds of the mesh
    this.geometry.computeBoundingBox();
    const bbox = this.geometry.boundingBox;
    const meshHeightUnits = bbox.max.y - bbox.min.y;
    const cmPerUnit = heightCm / meshHeightUnits;

    if (!this.jacobian) {
      this.computeJacobian(cmPerUnit);
    }

    const LAMBDA = 0.02; // Ridge penalty
    const targets = {};
    for (const [key, value] of Object.entries(targetMetrics)) {
      if (this.neutralMeasures[key] !== undefined && value != null) {
        // We use a high confidence (sigma=1) for explicitly entered targets
        targets[key] = { cm: value, sigma: 1.0 };
      }
    }
    
    const measures = Object.keys(targets);
    if (measures.length === 0) {
      result.notes.push("No supported circumferences requested.");
      return result;
    }

    const freeMorphs = Object.keys(this.morphDictionary);
    const w = {};
    freeMorphs.forEach(n => w[n] = currentWeights[n] || 0);

    const goal = {};
    measures.forEach(m => {
      goal[m] = targets[m].cm - this.neutralMeasures[m];
    });

    const pred = m => freeMorphs.reduce((s, n) => s + (this.jacobian[n][m] || 0) * w[n], 0);

    // Coordinate descent
    for (let sweep = 0; sweep < 400; sweep++) {
      let maxStep = 0;
      for (const n of freeMorphs) {
        // Optional: read limits from GLB metadata. Assuming -1 to 1 for now.
        const minLimit = -1;
        const maxLimit = 1;
        
        let num = 0, den = LAMBDA; // simplified scale assuming scale=1
        for (const m of measures) {
          const a = this.jacobian[n][m];
          if (!a) continue;
          const s2 = targets[m].sigma * targets[m].sigma;
          const resid = goal[m] - (pred(m) - a * w[n]);
          num += a * resid / s2;
          den += a * a / s2;
        }
        const nv = Math.min(maxLimit, Math.max(minLimit, num / den));
        maxStep = Math.max(maxStep, Math.abs(nv - w[n]));
        w[n] = nv;
      }
      if (maxStep < 1e-6) break;
    }

    // Clean up small weights
    freeMorphs.forEach(n => {
      if (Math.abs(w[n]) > 1e-4) result.weights[n] = w[n];
    });

    // Verification step
    const finalVertices = this.getDeformedVertices(result.weights);
    const finalMeasures = this.computeCircumferences(finalVertices, cmPerUnit);

    let allWithinTolerance = true;
    for (const [m, finalVal] of Object.entries(finalMeasures)) {
      result.achieved[m] = finalVal;
      
      // Only check tolerance for requested targets
      if (targets[m]) {
        const residual = finalVal - targets[m].cm;
        result.residuals[m] = residual;
        
        const tolerance = Math.max(1.0, targets[m].cm * 0.02);
        if (Math.abs(residual) > tolerance) {
          allWithinTolerance = false;
          result.notes.push(`Tolerance missed for ${m}: residual ${residual.toFixed(2)}cm exceeds ${tolerance.toFixed(2)}cm limit.`);
        }
      }
    }
    
    result.calibrationStatus = allWithinTolerance ? 'calibrated' : 'partial';

    return result;
  }
}

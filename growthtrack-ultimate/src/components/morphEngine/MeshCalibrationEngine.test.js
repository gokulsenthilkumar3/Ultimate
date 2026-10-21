import { describe, it, expect, beforeEach } from 'vitest';
import { MeshCalibrationEngine } from './MeshCalibrationEngine';

describe('MeshCalibrationEngine', () => {
  let mockMesh;

  beforeEach(() => {
    // 8 vertices, 2 rings (top and bottom)
    const positions = new Float32Array([
      // Ring 0 (chest) y=2
      1, 2, 0,  0, 2, 1,  -1, 2, 0,  0, 2, -1,
      // Ring 1 (waist) y=1
      1, 1, 0,  0, 1, 1,  -1, 1, 0,  0, 1, -1,
    ]);
    
    // Chest expand morph (index 0)
    const chestMorph = new Float32Array([
      1, 0, 0,  0, 0, 1,  -1, 0, 0,  0, 0, -1,
      0, 0, 0,  0, 0, 0,   0, 0, 0,  0, 0, 0,
    ]);
    
    // Waist expand morph (index 1)
    const waistMorph = new Float32Array([
      0, 0, 0,  0, 0, 0,   0, 0, 0,  0, 0, 0,
      1, 0, 0,  0, 0, 1,  -1, 0, 0,  0, 0, -1,
    ]);

    mockMesh = {
      geometry: {
        attributes: {
          position: { array: positions }
        },
        morphAttributes: {
          position: [
            { array: chestMorph },
            { array: waistMorph }
          ]
        },
        boundingBox: { min: { y: 0 }, max: { y: 2 } },
        computeBoundingBox: () => {}
      },
      morphTargetDictionary: {
        'Chest_Expand': 0,
        'Waist_Expand': 1
      },
      userData: {
        measurementRings: {
          chest: [0, 1, 2, 3],
          waist: [4, 5, 6, 7]
        }
      }
    };
  });

  it('computes correct baseline circumferences', () => {
    const engine = new MeshCalibrationEngine(mockMesh, 100);
    // mesh height is 2 units. Base height is 100 cm. cmPerUnit = 50.
    // Each ring is a diamond: side length = sqrt(1^2 + 1^2) = sqrt(2) = 1.4142.
    // Perimeter = 4 * 1.4142 = 5.6568 units
    // Circumference in cm = 5.6568 * 50 = 282.84 cm
    
    engine.computeJacobian(50);
    expect(engine.neutralMeasures.chest).toBeCloseTo(282.84, 1);
    expect(engine.neutralMeasures.waist).toBeCloseTo(282.84, 1);
  });
  
  it('solves for standard measurements correctly', () => {
    const engine = new MeshCalibrationEngine(mockMesh, 100);
    
    // We start at 282.84 cm for both. Let's aim for 300 and 250.
    const result = engine.solveForMeasurements({ chest: 300, waist: 250 });
    
    expect(result.calibrationStatus).toBe('calibrated');
    expect(result.achieved.chest).toBeCloseTo(300, 1);
    expect(result.achieved.waist).toBeCloseTo(250, 1);
  });

  it('handles missing measurements by keeping them near baseline', () => {
    const engine = new MeshCalibrationEngine(mockMesh, 100);
    
    // Only ask for waist 300. Chest is missing.
    const result = engine.solveForMeasurements({ waist: 300 });
    
    expect(result.calibrationStatus).toBe('calibrated');
    expect(result.achieved.waist).toBeCloseTo(300, 1);
    
    // Chest should remain relatively unchanged (near 282.84)
    expect(result.achieved.chest).toBeCloseTo(282.84, 0);
  });

  it('bounds extreme measurements due to [-1, 1] limits', () => {
    const engine = new MeshCalibrationEngine(mockMesh, 100);
    
    // Ask for impossible chest (1000 cm)
    const result = engine.solveForMeasurements({ chest: 1000 });
    
    expect(result.calibrationStatus).toBe('partial');
    expect(result.weights['Chest_Expand']).toBeCloseTo(1.0, 2); // Max bound
    expect(result.achieved.chest).toBeLessThan(1000); // Couldn't reach 1000
    expect(result.notes.some(n => n.includes('Tolerance missed'))).toBe(true);
  });
  
  it('balances conflicting measurements with ridge regression', () => {
    // Add a "Fat" morph that expands both chest and waist identically
    const fatMorph = new Float32Array([
      1, 0, 0,  0, 0, 1,  -1, 0, 0,  0, 0, -1,
      1, 0, 0,  0, 0, 1,  -1, 0, 0,  0, 0, -1,
    ]);
    mockMesh.geometry.morphAttributes.position.push({ array: fatMorph });
    mockMesh.morphTargetDictionary = { 'Fat_Expand': 2 }; // Override to ONLY use Fat
    
    const engine = new MeshCalibrationEngine(mockMesh, 100);
    
    // We want conflicting goals: Chest 350, Waist 220. 
    // Since Fat_Expand affects both equally, the solver must find a compromise.
    const result = engine.solveForMeasurements({ chest: 350, waist: 220 });
    
    expect(result.calibrationStatus).toBe('partial'); // Won't perfectly hit both
    
    // They should end up being roughly equal because Fat_Expand shifts both equally
    // and ridge regression minimizes the error across both targets.
    expect(result.achieved.chest).toBeCloseTo(result.achieved.waist, 1);
    
    // And it should have moved them both in some compromise direction
    expect(result.achieved.chest).toBeGreaterThan(230);
    expect(result.achieved.chest).toBeLessThan(340);
  });
});

import { Quaternion, Vector3 } from 'three';

class Heap {
  values = [];
  push(vertex, distance) {
    const value = { vertex, distance }; let i = this.values.length; this.values.push(value);
    while (i) { const parent = (i - 1) >> 1; if (this.values[parent].distance <= distance) break; this.values[i] = this.values[parent]; i = parent; }
    this.values[i] = value;
  }
  pop() {
    const first = this.values[0], last = this.values.pop();
    if (this.values.length) {
      let i = 0;
      while (i * 2 + 1 < this.values.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.values.length && this.values[child + 1].distance < this.values[child].distance) child++;
        if (this.values[child].distance >= last.distance) break;
        this.values[i] = this.values[child]; i = child;
      }
      this.values[i] = last;
    }
    return first;
  }
}

/** Graph-edge shortest paths approximate surface geodesics; no edge can jump
 * across a touching hand/torso gap. UV duplicates are welded in the reference
 * topology only, never by proximity after posing. */
export function createSurfaceGraph(geometry) {
  const points = geometry.attributes.position, ids = [], representatives = [], keys = new Map();
  for (let i = 0; i < points.count; i++) {
    const key = `${points.getX(i)},${points.getY(i)},${points.getZ(i)}`;
    if (!keys.has(key)) { keys.set(key, representatives.length); representatives.push(i); }
    ids[i] = keys.get(key);
  }
  const neighbors = representatives.map(() => new Set());
  for (let offset = 0; offset < geometry.index.count; offset += 3) {
    const vertices = [0, 1, 2].map(corner => ids[geometry.index.getX(offset + corner)]);
    for (let corner = 0; corner < 3; corner++) {
      const a = vertices[corner], b = vertices[(corner + 1) % 3];
      if (a !== b) { neighbors[a].add(b); neighbors[b].add(a); }
    }
  }
  return { ids, representatives, neighbors: neighbors.map(set => [...set]) };
}

function metric(graph, geometry) {
  const p = geometry.attributes.position;
  return graph.neighbors.map((neighbors, from) => neighbors.map(to => {
    const a = graph.representatives[from], b = graph.representatives[to];
    return Math.hypot(p.getX(a) - p.getX(b), p.getY(a) - p.getY(b), p.getZ(a) - p.getZ(b));
  }));
}

export function graphGeodesicDistances(graph, lengths, seed, limit = Infinity) {
  const distances = new Float64Array(graph.representatives.length).fill(Infinity), heap = new Heap();
  distances[seed] = 0; heap.push(seed, 0);
  while (heap.values.length) {
    const { vertex, distance } = heap.pop();
    if (distance !== distances[vertex] || distance > limit) continue;
    graph.neighbors[vertex].forEach((next, edge) => {
      const candidate = distance + lengths[vertex][edge];
      if (candidate < distances[next] && candidate <= limit) { distances[next] = candidate; heap.push(next, candidate); }
    });
  }
  return distances;
}

/** Research prototype inspired by intrinsic anchor projection, NOT a complete
 * implementation of the paper's heat/stream-function charts, Newton solve or
 * continuous collision handler. Collision acceptance must run independently. */
export function createGeodesicGarmentProjection(referenceBody, referenceGarment, data) {
  const started = performance.now(), graph = createSurfaceGraph(referenceBody), lengths = metric(graph, referenceBody);
  const points = referenceBody.attributes.position;
  const extrema = (axis, sign) => graph.representatives.reduce((best, vertex, id) =>
    points.getComponent(vertex, axis) * sign > points.getComponent(graph.representatives[best], axis) * sign ? id : best, 0);
  const seeds = [extrema(1, 1), extrema(1, -1), extrema(0, 1), extrema(2, -1)];
  const fields = seeds.map(seed => graphGeodesicDistances(graph, lengths, seed));
  const maxima = fields.map(field => Math.max(...field.filter(Number.isFinite)));
  let cachedLengths = lengths, cachedFields = fields, cachedMaxima = maxima;
  const patches = new Map();
  const bindings = data.clearanceBindings.map((binding, index) => {
    const seed = graph.ids[binding.indices[binding.weights.indexOf(Math.max(...binding.weights))]];
    if (!patches.has(seed)) {
      const distances = graphGeodesicDistances(graph, lengths, seed, 0.12);
      patches.set(seed, [...distances.keys()].filter(id => Number.isFinite(distances[id])));
    }
    const coordinate = fields.map((field, k) => binding.indices.reduce((sum, vertex, i) => sum + field[graph.ids[vertex]] * binding.weights[i], 0) / maxima[k]);
    if (!coordinate.every(Number.isFinite)) throw new Error('A garment anchor is disconnected from the geodesic landmarks.');
    return { coordinate, candidates: patches.get(seed), referencePosition: new Vector3().fromBufferAttribute(referenceGarment.attributes.position, index) };
  });
  const preparationMs = performance.now() - started;
  const groups = new Map(), edges = new Map();
  data.originalVertices.forEach((key, vertex) => { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(vertex); });
  for (let i = 0; i < referenceGarment.index.count; i += 3) for (let corner = 0; corner < 3; corner++) {
    const a = data.originalVertices[referenceGarment.index.getX(i + corner)], b = data.originalVertices[referenceGarment.index.getX(i + (corner + 1) % 3)];
    if (a !== b) edges.set(a < b ? `${a}/${b}` : `${b}/${a}`, [a, b]);
  }
  return {
    statistics: { preparationMs, graphVertices: graph.representatives.length, landmarks: seeds.length, localPatches: patches.size },
    project(body, garment, { maxDisplacementMetres = 0.08 } = {}) {
      const started = performance.now(), lengths = metric(graph, body);
      // Reuse fields only while the intrinsic edge metric is unchanged. Keep
      // the last computed metric so many sub-tolerance edits cannot accumulate
      // unchecked drift. This accelerates repeated poses, not new shape edits.
      const fieldCacheHit = lengths.every((edges, id) => edges.every((length, edge) => Math.abs(length - cachedLengths[id][edge]) <= 1e-7));
      if (!fieldCacheHit) {
        cachedLengths = lengths;
        cachedFields = seeds.map(seed => graphGeodesicDistances(graph, lengths, seed));
        cachedMaxima = cachedFields.map(field => Math.max(...field.filter(Number.isFinite)));
      }
      const currentFields = cachedFields, currentMaxima = cachedMaxima;
      const coordinates = graph.representatives.map((_, id) => currentFields.map((field, k) => field[id] / currentMaxima[k]));
      const fieldMs = performance.now() - started, initial = garment.attributes.position.array.slice();
      const position = new Vector3(), targetNormal = new Vector3(), rotation = new Quaternion(), delta = new Vector3();
      const referenceAnchor = new Vector3(), referenceNormal = new Vector3();
      const seams = new Map();
      bindings.forEach((binding, vertex) => {
        // Stable top-three selection avoids allocating and sorting a record
        // for every candidate at every garment vertex.
        const neighbors = [];
        for (const id of binding.candidates) {
          let error = 0;
          for (let k = 0; k < currentFields.length; k++) error += (coordinates[id][k] - binding.coordinate[k]) ** 2;
          let slot = 0;
          while (slot < neighbors.length && neighbors[slot].error <= error) slot++;
          if (slot < 3) { neighbors.splice(slot, 0, { id, error }); if (neighbors.length > 3) neighbors.pop(); }
        }
        const weights = neighbors.map(({ error }) => 1 / Math.max(error, 1e-12)), total = weights.reduce((a, b) => a + b, 0);
        position.set(0, 0, 0); targetNormal.set(0, 0, 0);
        referenceAnchor.set(0, 0, 0); referenceNormal.set(0, 0, 0);
        neighbors.forEach(({ id }, i) => {
          const source = graph.representatives[id];
          position.addScaledVector(new Vector3().fromBufferAttribute(body.attributes.position, source), weights[i] / total);
          targetNormal.addScaledVector(new Vector3().fromBufferAttribute(body.attributes.normal, source), weights[i] / total);
          referenceAnchor.addScaledVector(new Vector3().fromBufferAttribute(points, source), weights[i] / total);
          referenceNormal.addScaledVector(new Vector3().fromBufferAttribute(referenceBody.attributes.normal, source), weights[i] / total);
        });
        // Transfer the selected chart correspondence's displacement. Its
        // reference residual must use the SAME neighbors and weights; mixing
        // it with the authored binding moved even an unchanged neutral body.
        rotation.setFromUnitVectors(referenceNormal.normalize(), targetNormal.normalize());
        position.add(binding.referencePosition.clone().sub(referenceAnchor).applyQuaternion(rotation));
        delta.subVectors(position, new Vector3().fromArray(initial, vertex * 3)).clampLength(0, maxDisplacementMetres);
        const key = data.originalVertices[vertex];
        if (!seams.has(key)) seams.set(key, new Vector3().fromArray(initial, vertex * 3).add(delta));
        const point = seams.get(key); garment.attributes.position.setXYZ(vertex, point.x, point.y, point.z);
      });
      // Three local edge-length sweeps regularize the chart projection. This
      // is a lightweight prototype, not the paper's Newton/CCD implementation.
      const relaxationStart = performance.now();
      for (let sweep = 0; sweep < 3; sweep++) for (const [a, b] of edges.values()) {
        const first = groups.get(a)[0], second = groups.get(b)[0], pa = seams.get(a), pb = seams.get(b);
        const rest = new Vector3().fromArray(initial, first * 3).distanceTo(new Vector3().fromArray(initial, second * 3));
        delta.subVectors(pb, pa); const length = delta.length();
        if (length <= 1e-10) continue;
        delta.multiplyScalar((length - rest) / length * 0.25);
        pa.add(delta); pb.sub(delta);
        for (const [key, point] of [[a, pa], [b, pb]]) {
          const indices = groups.get(key), origin = new Vector3().fromArray(initial, indices[0] * 3);
          point.sub(origin).clampLength(0, maxDisplacementMetres).add(origin);
          for (const vertex of indices) garment.attributes.position.setXYZ(vertex, point.x, point.y, point.z);
        }
      }
      garment.attributes.position.needsUpdate = true; garment.computeVertexNormals();
      return { method: 'four-landmark-graph-geodesic-coordinates', fieldMs, projectionMs: performance.now() - started,
        fieldCacheHit, relaxationMs: performance.now() - relaxationStart, relaxationSweeps: 3, collisionCertified: false, preparationMs };
    },
  };
}

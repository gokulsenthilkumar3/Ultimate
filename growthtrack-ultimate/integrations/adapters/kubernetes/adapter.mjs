// Optional Kubernetes service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'kubernetes';
export const createAdapter = options => createHttpBridge(options);

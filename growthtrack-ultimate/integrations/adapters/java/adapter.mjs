// Optional Java service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'java';
export const createAdapter = options => createHttpBridge(options);

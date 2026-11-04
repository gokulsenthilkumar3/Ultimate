// Optional Ruby service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'ruby';
export const createAdapter = options => createHttpBridge(options);

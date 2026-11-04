// Optional AWS service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'aws';
export const createAdapter = options => createHttpBridge(options);

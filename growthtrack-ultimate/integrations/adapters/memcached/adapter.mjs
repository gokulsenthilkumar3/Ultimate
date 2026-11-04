// Optional Memcached service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'memcached';
export const createAdapter = options => createHttpBridge(options);

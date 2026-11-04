// Optional GitLab service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'gitlab';
export const createAdapter = options => createHttpBridge(options);

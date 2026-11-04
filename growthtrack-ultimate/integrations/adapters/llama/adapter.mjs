// Optional Meta Llama service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'llama';
export const createAdapter = options => createHttpBridge(options);

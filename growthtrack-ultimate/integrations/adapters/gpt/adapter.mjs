// Optional GPT / OpenAI service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'gpt';
export const createAdapter = options => createHttpBridge(options);

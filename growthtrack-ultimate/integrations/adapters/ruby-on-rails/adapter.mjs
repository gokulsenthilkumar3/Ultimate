// Optional Ruby on Rails service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'ruby-on-rails';
export const createAdapter = options => createHttpBridge(options);

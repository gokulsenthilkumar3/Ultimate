// Optional DynamoDB service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'dynamodb';
export const createAdapter = options => createHttpBridge(options);

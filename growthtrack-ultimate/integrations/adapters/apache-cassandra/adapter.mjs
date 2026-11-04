// Optional Apache Cassandra service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'apache-cassandra';
export const createAdapter = options => createHttpBridge(options);

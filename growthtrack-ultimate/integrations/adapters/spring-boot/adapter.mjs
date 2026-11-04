// Optional Spring Boot service boundary; see adapter.json for unimplemented acceptance gates.
import { createHttpBridge } from '../httpBridge.mjs';
export const id = 'spring-boot';
export const createAdapter = options => createHttpBridge(options);

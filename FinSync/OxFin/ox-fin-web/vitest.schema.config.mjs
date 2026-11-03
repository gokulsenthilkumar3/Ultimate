import { fileURLToPath } from 'node:url';
export default {
 resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
 test: { environment: 'node', include: ['src/app/api/user/transfer/route.test.mjs'] }
};

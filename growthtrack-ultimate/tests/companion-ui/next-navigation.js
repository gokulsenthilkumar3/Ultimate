const router = { push: path => location.assign(path), replace: path => location.replace(path), back: () => history.back(), refresh: () => location.reload(), prefetch: () => {} };
export const useRouter = () => router;
export const usePathname = () => location.pathname;
export const useSearchParams = () => new URLSearchParams(location.search);
export const redirect = path => location.replace(path);
export const notFound = () => { throw new Error('No fixture page at this route.'); };

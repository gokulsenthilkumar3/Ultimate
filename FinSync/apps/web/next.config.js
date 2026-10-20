/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    transpilePackages: [],
    experimental: {
        // appDir is stable in Next.js 15
    },
};

module.exports = nextConfig;

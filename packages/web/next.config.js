/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    images: {
        unoptimized: true,
    },
    async headers() {
        return [{
            source: '/:all*(webp|jpg|png|svg|ico|woff2)',
            headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
            ],
        }];
    },
};

module.exports = nextConfig;

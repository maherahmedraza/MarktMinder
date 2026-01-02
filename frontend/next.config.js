/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '*.amazon.com' },
            { protocol: 'https', hostname: '*.amazon.de' },
            { protocol: 'https', hostname: '*.amazon.co.uk' },
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'i.etsystatic.com' },
            { protocol: 'https', hostname: '*.otto.de' },
            { protocol: 'https', hostname: 'i.otto.de' },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*',
            },
        ];
    },
};

module.exports = nextConfig;

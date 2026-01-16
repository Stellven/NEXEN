/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    async rewrites() {
        // In Docker, use service name 'backend'; otherwise use localhost
        const apiUrl = process.env.API_URL || 'http://backend:8000';
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
            {
                source: '/ws',
                destination: `${apiUrl}/ws`,
            },
        ];
    },
};

module.exports = nextConfig;

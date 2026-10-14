/** @type {import('next').NextConfig} */
// Where the API lives. Read at build time.
//  - local dev: http://localhost:4000 (default)
//  - Render: API_HOST is the API service's host name (set by render.yaml)
//  - own server with Caddy: leave unset; Caddy routes /api itself
const apiUrl =
  process.env.API_URL ??
  (process.env.API_HOST ? `https://${process.env.API_HOST}` : process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return apiUrl ? [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }] : [];
  },
};
export default nextConfig;

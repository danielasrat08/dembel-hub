/** @type {import('next').NextConfig} */
// /api/* is forwarded to the API by app/api/[...path]/route.ts at request time (see API_URL there).
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
};
export default nextConfig;

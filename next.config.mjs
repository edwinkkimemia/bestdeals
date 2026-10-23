/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // The product catalogue moved from /shop to /browse. Keep old links,
      // bookmarks and search results working with a permanent redirect.
      { source: "/shop", destination: "/browse", permanent: true },
      { source: "/shop/:path*", destination: "/browse/:path*", permanent: true },
    ];
  },
};

export default nextConfig;

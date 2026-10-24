export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/product/", "/classifieds", "/shops", "/services", "/deals", "/location", "/seller/", "/blog"],
        disallow: ["/dashboard", "/admin", "/api/", "/cart", "/checkout", "/orders", "/wishlist", "/auth/"],
      },
    ],
    sitemap: "https://chap.co.ke/sitemap.xml",
    host: "https://chap.co.ke",
  };
}

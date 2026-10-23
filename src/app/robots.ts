export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/product/", "/classifieds", "/shops", "/services", "/deals"],
        disallow: ["/dashboard", "/admin", "/api/", "/cart", "/checkout", "/orders", "/wishlist", "/auth/"],
      },
    ],
    sitemap: "https://chap.co.ke/sitemap.xml",
  };
}

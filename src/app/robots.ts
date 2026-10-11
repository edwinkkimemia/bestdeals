export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/", "/classifieds", "/shops", "/services", "/deals"],
        disallow: ["/dashboard", "/admin", "/api/", "/cart", "/checkout", "/orders", "/messages", "/wishlist", "/auth/"],
      },
    ],
    sitemap: "https://chap.co.ke/sitemap.xml",
  };
}

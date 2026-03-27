import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/setup",
          "/profile",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: "https://redcoreos.net/sitemap.xml",
  };
}

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://redcoreos.net";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/donate`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ouden.cc";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/redcore-os`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/redcore-tuning`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/windows-debloat`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/windows-11-debloat`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/custom-windows`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/why-redcore`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/work-pc-debloat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/downloads`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/patch-notes`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/donate`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/subscription`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];
}

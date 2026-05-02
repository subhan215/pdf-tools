import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const lastModified = new Date("2026-05-02T00:00:00.000Z");
export const dynamic = "force-static";

const routes = [
  "",
  "/batch",
  "/collaborate",
  "/compress",
  "/edit",
  "/feedback",
  "/merge",
  "/pdf-to-image",
  "/privacy",
  "/split",
  "/terms",
  "/watermark",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}

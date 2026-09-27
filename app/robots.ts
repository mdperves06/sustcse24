import type { MetadataRoute } from "next";

/** Only the landing and about pages may be crawled; all member data is private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/$", "/about$"], disallow: ["/"] }],
  };
}

import type { MetadataRoute } from "next";

import { buildRobots, canonicalPublicOrigin } from "@/seo/metadata-routes";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(canonicalPublicOrigin(process.env.APP_URL));
}

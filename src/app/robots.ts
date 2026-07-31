import type { MetadataRoute } from "next";

/** Index public film pages; keep the team app and APIs out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/", "/dashboard", "/admin", "/brain", "/assets",
        "/team", "/campaign", "/reviews", "/rewards", "/films",
        "/join", "/signin", "/signup",
      ],
    },
    sitemap: "https://pr.fylym.com/sitemap.xml",
  };
}

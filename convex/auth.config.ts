import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // Same as Clerk Frontend API URL / JWT issuer domain
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ??
        process.env.CLERK_FRONTEND_API_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

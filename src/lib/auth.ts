
import NextAuth, { AuthOptions, Profile } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

// Define an interface for the Keycloak profile that includes roles
interface KeycloakProfile extends Profile {
    realm_access?: {
      roles: string[];
    };
    resource_access?: {
      [clientId: string]: {
        roles: string[];
      }
    };
    // Any extra claims
    [claim: string]: unknown;
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.OAUTH_CLIENT_ID as string,
      clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
      issuer: process.env.OAUTH_ISSUER as string,
      id: "keycloak", // A unique identifier for this provider
      name: "INFN IdP", // A display name for this provider
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
        // On sign-in, `profile` is available.
        // We are casting profile to our custom type to access roles.
        const kcProfile = profile as KeycloakProfile | undefined;
        if (kcProfile && kcProfile.realm_access) {
            token.roles = kcProfile.realm_access.roles;
        }
        // Add client roles (for a specific client, e.g. "my-client")
        if (kcProfile && kcProfile.resource_access && kcProfile.resource_access["license-studio"]) {
            token.clientRoles = kcProfile.resource_access["license-studio"].roles;
      }
        return token;
    },
    async session({ session, token }) {
        // Add roles to the session object, so it's available on the client.
        if (token.roles) {
            session.user.roles = token.roles as string[];
        }
        if (token.clientRoles) {
          session.user.clientRoles = token.clientRoles as string[] | undefined;
        }
        return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const handler = NextAuth(authOptions);

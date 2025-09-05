
import NextAuth, { AuthOptions, Profile } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

// Define an interface for the JWT payload from the access token
interface AccessTokenPayload {
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
    async jwt({ token, account }) {
        // On the first sign-in, the `account` object is available.
        // We decode the access_token to get the roles.
        if (account?.access_token) {
            try {
                const accessTokenPayload: AccessTokenPayload = JSON.parse(
                    Buffer.from(account.access_token.split('.')[1], 'base64').toString()
                );
                
                if (accessTokenPayload.realm_access) {
                    token.roles = accessTokenPayload.realm_access.roles;
                }
                
                // Use the client ID from environment variables to access client-specific roles.
                const clientId = process.env.OAUTH_CLIENT_ID;
                if (clientId && accessTokenPayload.resource_access && accessTokenPayload.resource_access[clientId]) {
                    token.clientRoles = accessTokenPayload.resource_access[clientId].roles;
                }
            } catch (error) {
                console.error("Error decoding access token:", error);
            }
        }
        return token;
    },
    async session({ session, token }) {
        // Add roles to the session object, so it's available on the client.
        if (token.roles) {
            session.user.roles = token.roles as string[];
        }
        if (token.clientRoles) {
          session.user.clientRoles = token.clientRoles as string[];
        }
        return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const handler = NextAuth(authOptions);

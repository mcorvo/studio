
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';

const keycloakClientId = process.env.OAUTH_CLIENT_ID;
const keycloakClientSecret = process.env.OAUTH_CLIENT_SECRET;
const keycloakIssuer = process.env.OAUTH_ISSUER;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!keycloakClientId || !keycloakClientSecret || !keycloakIssuer || !nextAuthSecret) {
    throw new Error('Missing OAuth environment variables. Please check your .env file.');
}

export const authOptions: NextAuthOptions = {
    providers: [
        {
            id: "keycloak",
            name: "Keycloak",
            type: "oauth",
            wellKnown: `${keycloakIssuer}/.well-known/openid-configuration`,
            authorization: { params: { scope: "openid email profile" } },
            idToken: true,
            clientId: keycloakClientId,
            clientSecret: keycloakClientSecret,
            checks: ["pkce", "state"],
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name ?? profile.preferred_username,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        },
    ],
    secret: nextAuthSecret,
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

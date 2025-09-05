
import "next-auth";

declare module "next-auth" {
  /**
   * Extends the built-in session.user object to include roles.
   */
  interface User {
    roles?: string[];
    clientRoles?: string[];
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the built-in JWT token to include roles.
   */
  interface JWT {
    roles?: string[];
  }
}

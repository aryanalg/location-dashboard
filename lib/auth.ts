import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getEnv } from "./env";

interface RefreshedTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error_description?: string;
}

// Token refresh function
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const refreshToken = token.refreshToken;
    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    const env = getEnv();
    const url = `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.AZURE_AD_CLIENT_ID,
        client_secret: env.AZURE_AD_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "openid profile email Files.Read.All Sites.Read.All offline_access",
      }),
    });

    const refreshedTokens = (await response.json()) as RefreshedTokenResponse;

    if (!response.ok || !refreshedTokens.access_token || !refreshedTokens.expires_in) {
      throw new Error(refreshedTokens.error_description || "Failed to refresh token");
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          // Added offline_access for refresh tokens
          scope: "openid profile email Files.Read.All Sites.Read.All offline_access",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in - store tokens
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          expiresAt: account.expires_at,
          refreshToken: account.refresh_token,
        };
      }

      // Return token if it's still valid (with 5 minute buffer)
      const expiresAt = token.expiresAt;
      if (expiresAt && Date.now() < expiresAt * 1000 - 5 * 60 * 1000) {
        return token;
      }

      // Token is expired or about to expire, refresh it
      if (token.refreshToken) {
        return await refreshAccessToken(token);
      }

      // No refresh token available
      return { ...token, error: "NoRefreshToken" };
    },
    async session({ session, token }) {
      // SECURITY: Do NOT expose accessToken to the client
      // Only pass necessary user info and error status
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // Session expires in 24 hours
    maxAge: 24 * 60 * 60,
  },
  // Handle token errors by forcing re-authentication
  events: {
    async signOut() {
      // Clean up any server-side state if needed
    },
  },
};

// Helper function to get access token from JWT (server-side only)
export async function getAccessTokenFromToken(token: JWT | null | undefined): Promise<string | null> {
  if (token?.error) {
    return null;
  }
  return token?.accessToken || null;
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    expiresAt?: number;
    refreshToken?: string;
    error?: string;
  }
}

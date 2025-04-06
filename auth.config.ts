import type { NextAuthConfig } from 'next-auth';


 
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {

    async signIn({ account, profile }) {
      console.log("Inside Signin");
      if (account?.provider === "google") {
        const emailVerified = profile?.email_verified;
        console.log("emailVerified", emailVerified);
        const email = profile?.email ?? "";
  
        if (emailVerified && email.endsWith("@gmail.com")) {
          return true;
        }
        return false; // ❌ Block sign-in if not verified or wrong domain
      }
      return true; // ✅ Allow other providers
    },

    // 🚧 Controls access to routes (App Router only)
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isRoom = nextUrl.pathname.startsWith('/rooms');
      const isRitaStreaming = nextUrl.pathname.startsWith('/rita-streaming');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isRoom) {
        // if isRoom, we don't check it
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      else if (isRitaStreaming) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },

  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
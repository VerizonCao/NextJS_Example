import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
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
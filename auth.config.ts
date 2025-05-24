import type { NextAuthConfig } from 'next-auth';
import { userExistsByEmail, createUser, getUserByIdEmail } from './app/lib/data';

import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 11)

 
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
  
        if (emailVerified) {
          return true;
        }
        return false; // ❌ Block sign-in if not verified or wrong domain
      }
      
      if (account?.provider === "discord") {
        // Discord emails are always verified if present
        const email = profile?.email ?? "";
        if (email) {
          return true;
        }
        return false; // ❌ Block sign-in if no email
      }
      
      return true; // ✅ Allow other providers
    },

    async session({ session, token }) {
      // Add email or any other info to session
      if (token?.email) {
        session.user.email = token.email;
      }
      if (token?.userId) {
        (session.user as any).userId = token.userId;
      }
      return session;
    },
    async jwt({ token, account, profile, user }) {

      // Save email in JWT token
      if (account && profile?.email) {
        const email = profile.email;

        const exists = await userExistsByEmail(email);

        let userId = null;
        if (!exists) {
          userId = 'u-' + nanoid();

          // Build a FormData object to match createUser's input format
          const formData = new FormData();
          formData.set('user_id', userId);
          formData.set('email', email);
          // Create the user
          await createUser(formData);
        }
        else
        {
          userId = await getUserByIdEmail(email);
        }

        token.email = email;
        token.user_id = userId;

      }
      return token;
    },

    // 🚧 Controls access to routes (App Router only)
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
    
      const isOnDashboard = pathname.startsWith('/dashboard');
      const isRoom = pathname.startsWith('/rooms');
      const isAudioSample = pathname.startsWith('/audio_samples');
      const isEditAvatar = pathname.startsWith('/dashboard/edit-avatar');
      const isMyAvatars = pathname.startsWith('/dashboard/my-avatars');
      const isAvatarStudio = pathname.startsWith('/dashboard/avatar-studio');
    
      // ✅ Allow audio file requests to go through without redirect
      if (isAudioSample) {
        return true;
      }
    
      // Redirect from / to /dashboard
      if (pathname === '/') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
    
      if (isOnDashboard) {
        if ((isEditAvatar || isMyAvatars || isAvatarStudio) && !isLoggedIn) {
          return false; // Block access to avatar-related routes if not logged in
        }
        return true; // Allow access to other dashboard routes without login
      } else if (isRoom) {
        if (isLoggedIn) return true;
        return false;
      }
    
      // ✅ Redirect only if logged in AND not accessing special routes
      if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
    
      return true;
    }
    

  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
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
    
      const isRoom = pathname.startsWith('/rooms');
      const isAudioSample = pathname.startsWith('/audio_samples');
      const isCharacterStudio = pathname.startsWith('/character-studio');
      const isChat = pathname.startsWith('/chat');
      const isPreviousChats = pathname.startsWith('/my-chats');
      // add or edit
      const isNewCharacter = pathname.startsWith('/new-character');
      const isEditCharacter = pathname.startsWith('/edit-character');
      // profile
      const isProfile = pathname.startsWith('/profile');
      // subscription
      const isSubscription = pathname.startsWith('/subscription');
    
      // ✅ Allow audio file requests to go through without redirect
      if (isAudioSample) {
        return true;
      }
    
      // ✅ Allow root path without redirect - show home page
      if (pathname === '/') {
        return true;
      }
      
      // ✅ Allow access to profile page
      if (isProfile) {
        if (isLoggedIn) return true;
        return Response.redirect(new URL('/', nextUrl));
      }

      // ✅ Allow access to subscription page - requires login
      if (isSubscription) {
        if (isLoggedIn) return true;
        return Response.redirect(new URL('/', nextUrl));
      }
      
      // ✅ Allow access to create page - users can create without login but need login to save
      if (isNewCharacter || isEditCharacter || isCharacterStudio) {
        if (isLoggedIn) return true;
        return false;
      }

      if (isChat) {
        if (isLoggedIn) return true;
        return false;
      }

      if (isPreviousChats) {
        if (isLoggedIn) return true;
        return Response.redirect(new URL('/', nextUrl));
      }
      
      if (isRoom) {
        if (isLoggedIn) return true;
        return false;
      }
    
      // ✅ Redirect only if logged in AND not accessing special routes
      if (isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl));
      }
    
      return true;
    }
    

  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
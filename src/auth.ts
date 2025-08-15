import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/db";
import client from "@/lib/db/client";
import User from "@/lib/db/models/user.model";

import NextAuth, { type DefaultSession } from "next-auth";
import authConfig from "../auth.config";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  // eslint-disable-next-line no-unused-vars
  interface Session {
    user: {
      role: string;
      mobile?: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // کاهش به 7 روز برای کاهش اندازه
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // کاهش به 7 روز برای کاهش اندازه
  },
  adapter: MongoDBAdapter(client),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      // تنظیمات بهینه‌شده برای کاهش اندازه هدرها و بهبود Google OAuth
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile", // محدود کردن scope برای کاهش اندازه token
        },
      },
      // تنظیمات profile برای کاهش داده‌های ذخیره شده
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // حذف سایر فیلدهای غیرضروری برای کاهش اندازه session
        };
      },
    }),
    CredentialsProvider({
      credentials: {
        email: {
          type: "email",
        },
        password: { type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("Authorize called with:", credentials?.email);

          await connectToDatabase();
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials");
            return null;
          }

          const user = await User.findOne({ email: credentials.email });
          console.log("User found:", user ? "Yes" : "No");

          if (!user || !user.password) {
            console.log("User not found or no password");
            return null;
          }

          const isMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          console.log("Password match:", isMatch);

          if (isMatch) {
            console.log("Authentication successful for:", user.email);
            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              mobile: user.mobile,
            };
          }

          console.log("Password does not match");
          return null;
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        // فقط اطلاعات ضروری را در token ذخیره کن
        token.name = user.name || user.email!.split("@")[0];
        token.role = (user as { role: string }).role;
        // حذف mobile از token برای کاهش اندازه
        // token.mobile = (user as { mobile?: string }).mobile;
      }

      if (session?.user?.name && trigger === "update") {
        token.name = session.user.name;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // فقط اطلاعات ضروری را در session ذخیره کن
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role as string;
      }
      if (token.name) {
        session.user.name = token.name;
      }
      // حذف mobile از session برای کاهش اندازه
      // if (token.mobile) {
      //   session.user.mobile = token.mobile as string;
      // }
      return session;
    },
    // اضافه کردن callback برای مدیریت بهتر خطاها
    signIn: async ({ user, account, profile }) => {
      // برای Google OAuth
      if (account?.provider === "google") {
        try {
          await connectToDatabase();

          // بررسی وجود کاربر
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // ایجاد کاربر جدید با اطلاعات Google
            const newUser = new User({
              name: user.name,
              email: user.email,
              image: user.image,
              role: "user", // نقش پیش‌فرض
              emailVerified: new Date(),
              createdAt: new Date(),
            });
            await newUser.save();
          }

          return true;
        } catch (error) {
          console.error("Error in Google sign-in:", error);
          return false;
        }
      }

      return true;
    },
  },
  // تنظیمات اضافی برای کاهش اندازه هدرها
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Host-next-auth.session-token`
          : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60, // کاهش به 7 روز
      },
    },
    // تنظیمات بهینه برای کاهش اندازه cookies
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Host-next-auth.callback-url`
          : `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 60, // کاهش به 30 دقیقه برای کاهش اندازه
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Host-next-auth.csrf-token`
          : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 60, // کاهش به 30 دقیقه برای کاهش اندازه
      },
    },
    // بهینه‌سازی state cookie برای Google OAuth
    state: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Host-next-auth.state`
          : `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 دقیقه فقط
      },
    },
    // بهینه‌سازی pkceCodeVerifier برای Google OAuth
    pkceCodeVerifier: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Host-next-auth.pkce.code_verifier`
          : `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 دقیقه فقط
      },
    },
    // بهینه‌سازی nonce برای Google OAuth
    nonce: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Host-next-auth.nonce`
          : `next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 دقیقه فقط
      },
    },
  },
});

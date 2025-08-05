"use server";
import { signIn, signOut } from "@/auth";
import { IUserSignIn, IUserSignUp } from "@/types";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";
import { formatError } from "../utils";

import bcrypt from "bcryptjs";
import { UserSignUpSchema } from "../validator";

export async function signInWithCredentials(user: IUserSignIn) {
  try {
    const result = await signIn("credentials", {
      email: user.email,
      password: user.password,
      redirect: false,
    });

    console.log("NextAuth signIn result:", result);

    if (result?.error) {
      return { error: result.error, status: "error" };
    }

    if (result?.ok) {
      return { success: true, status: "success" };
    }

    return { error: "Authentication failed", status: "error" };
  } catch (error) {
    console.error("SignIn error:", error);
    return { error: "Authentication failed", status: "error" };
  }
}

export async function testUserCredentials(user: IUserSignIn) {
  try {
    await connectToDatabase();
    const dbUser = await User.findOne({ email: user.email });

    if (!dbUser) {
      return { error: "User not found", userExists: false };
    }

    const isPasswordValid = await bcrypt.compare(
      user.password,
      dbUser.password
    );

    return {
      userExists: true,
      passwordValid: isPasswordValid,
      user: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
    };
  } catch (error) {
    console.error("Test credentials error:", error);
    return { error: "Database error", userExists: false };
  }
}

export const SignOut = async () => {
  const redirectTo = await signOut({ redirect: false });
  redirect(redirectTo.redirect);
};

export const SignInWithGoogle = async () => {
  await signIn("google");
};
export async function registerUser(userSignUp: IUserSignUp) {
  try {
    const user = await UserSignUpSchema.parseAsync({
      name: userSignUp.name,
      email: userSignUp.email,
      password: userSignUp.password,
      confirmPassword: userSignUp.confirmPassword,
    });

    await connectToDatabase();
    await User.create({
      ...user,
      password: await bcrypt.hash(user.password, 5),
    });
    return { success: true, message: "User created successfully" };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
}

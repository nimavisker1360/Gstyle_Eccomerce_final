import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";
import { sendPasswordResetEmail } from "@/emails";
import { SERVER_URL } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid email" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email });

    // Always respond with 200 to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    try {
      await sendPasswordResetEmail({ to: email, token });
    } catch (e) {
      console.warn("Failed to send reset email", e);
    }

    // For development visibility, log the reset link
    const baseUrl =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      SERVER_URL ||
      "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
      email
    )}`;
    console.log("Password reset link:", resetLink);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

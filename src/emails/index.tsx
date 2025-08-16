import { Resend } from "resend";
import PurchaseReceiptEmail from "./purchase-receipt";
import PasswordResetEmail from "./password-reset";
import { IOrder } from "@/lib/db/models/order.model";
import { SENDER_EMAIL, SENDER_NAME, SERVER_URL } from "@/lib/constants";
import { formatId } from "@/lib/utils";
import nodemailer from "nodemailer";

export const sendPurchaseReceipt = async ({ order }: { order: IOrder }) => {
  try {
    // Ensure order and user data exist
    if (!order) {
      throw new Error("Order is required");
    }

    // Handle user field properly - it could be populated or just an ObjectId
    let userEmail = "";
    if (
      typeof order.user === "object" &&
      order.user !== null &&
      "email" in order.user
    ) {
      userEmail = (order.user as any).email;
    } else {
      throw new Error("User email not found in order");
    }

    if (!userEmail) {
      throw new Error("User email is empty");
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY missing. Skipping purchase receipt email.");
      return;
    }
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: userEmail,
      subject: `Order ${formatId(order._id)} Confirmation`,
      react: <PurchaseReceiptEmail order={order} />,
    });
  } catch (error) {
    console.error("Failed to send purchase receipt email:", error);
    throw error;
  }
};

export const sendPasswordResetEmail = async ({
  to,
  token,
}: {
  to: string;
  token: string;
}) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_SERVER_URL || SERVER_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(to)}`;

  // 1) Try Resend first if available
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";
      await resend.emails.send({
        from: `${SENDER_NAME} <${fromEmail}>`,
        to,
        subject: "درخواست بازیابی رمز عبور",
        react: <PasswordResetEmail resetLink={resetLink} />,
      });
      return;
    } catch (err) {
      console.warn("Resend send failed, will try SMTP fallback:", err);
    }
  }

  // 2) Fallback: Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const html = `
        <div style="font-family:Tahoma, Arial, sans-serif; direction:rtl;">
          <h2>بازیابی رمز عبور</h2>
          <p>برای تنظیم رمز عبور جدید، روی لینک زیر کلیک کنید. این لینک تا ۱ ساعت معتبر است.</p>
          <p><a href="${resetLink}" target="_blank" rel="noreferrer">تغییر رمز عبور</a></p>
          <p>اگر شما این درخواست را ارسال نکرده‌اید، این پیام را نادیده بگیرید.</p>
        </div>`;

      await transporter.sendMail({
        from: `${SENDER_NAME} <${process.env.GMAIL_USER}>`,
        to,
        subject: "درخواست بازیابی رمز عبور",
        html,
      });
      return;
    } catch (err) {
      console.warn(
        "Gmail SMTP send failed, will try custom SMTP fallback:",
        err
      );
    }
  }

  // 3) Fallback: Custom SMTP
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  ) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const html = `
      <div style="font-family:Tahoma, Arial, sans-serif; direction:rtl;">
        <h2>بازیابی رمز عبور</h2>
        <p>برای تنظیم رمز عبور جدید، روی لینک زیر کلیک کنید. این لینک تا ۱ ساعت معتبر است.</p>
        <p><a href="${resetLink}" target="_blank" rel="noreferrer">تغییر رمز عبور</a></p>
        <p>اگر شما این درخواست را ارسال نکرده‌اید، این پیام را نادیده بگیرید.</p>
      </div>`;

    await transporter.sendMail({
      from: `${SENDER_NAME} <${process.env.SMTP_USER}>`,
      to,
      subject: "درخواست بازیابی رمز عبور",
      html,
    });
    return;
  }

  console.warn(
    "No email provider configured. Set RESEND_API_KEY or SMTP/Gmail env vars to enable password reset emails."
  );
};

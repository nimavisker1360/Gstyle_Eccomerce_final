import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import React from "react";
import SupportCheckoutEmail from "@/emails/support-checkout";
import { SENDER_EMAIL, SENDER_NAME } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = process.env.SUPPORT_EMAIL || "info@gstylebot.com";

    // Basic shape normalization (keep it permissive & robust)
    const payload = {
      items: Array.isArray(body?.items) ? body.items : [],
      itemsPrice: Number(body?.itemsPrice) || 0,
      shippingPrice:
        body?.shippingPrice === undefined
          ? undefined
          : Number(body?.shippingPrice),
      taxPrice:
        body?.taxPrice === undefined ? undefined : Number(body?.taxPrice),
      totalPrice: Number(body?.totalPrice) || 0,
      paymentMethod: body?.paymentMethod || undefined,
      shippingAddress: body?.shippingAddress || undefined,
      expectedDeliveryDate: body?.expectedDeliveryDate || undefined,
    };

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is missing. Skipping email send.");
      return NextResponse.json({ success: true, skipped: true });
    }
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to,
      subject: "Checkout Support Request",
      react: React.createElement(SupportCheckoutEmail, { payload }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to send" },
      { status: 500 }
    );
  }
}

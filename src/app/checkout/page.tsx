import { Metadata } from "next";
import CheckoutForm from "./checkout-form";

export const metadata: Metadata = {
  title: "تسویه حساب",
};

export default async function CheckoutPage() {
  // دسترسی آزاد: بدون نیاز به ورود نمایش می‌دهیم
  return <CheckoutForm />;
}

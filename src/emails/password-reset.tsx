import * as React from "react";

export default function PasswordResetEmail({
  resetLink,
}: {
  resetLink: string;
}) {
  return (
    <div style={{ fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <h2>بازیابی رمز عبور</h2>
      <p>
        برای تنظیم رمز عبور جدید، روی لینک زیر کلیک کنید. این لینک تا ۱ ساعت
        معتبر است.
      </p>
      <p>
        <a href={resetLink} target="_blank" rel="noreferrer">
          تغییر رمز عبور
        </a>
      </p>
      <p>اگر شما این درخواست را ارسال نکرده‌اید، این پیام را نادیده بگیرید.</p>
    </div>
  );
}



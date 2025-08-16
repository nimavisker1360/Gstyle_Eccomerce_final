"use client";
import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export const dynamic = "force-dynamic";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = useMemo(
    () => password.length >= 6 && password === confirm,
    [password, confirm]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "خطا در تغییر رمز");
      toast({ title: "موفق", description: "رمز عبور با موفقیت تغییر کرد" });
      router.push("/sign-in");
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "مشکلی پیش آمد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-center title-black">
            تعیین رمز عبور جدید
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-right">رمز جدید</label>
              <Input
                type="password"
                className="text-right"
                placeholder="رمز جدید"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-2 text-right">تکرار رمز جدید</label>
              <Input
                type="password"
                className="text-right"
                placeholder="تکرار رمز جدید"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button
              disabled={!valid || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "در حال ذخیره..." : "ذخیره رمز جدید"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

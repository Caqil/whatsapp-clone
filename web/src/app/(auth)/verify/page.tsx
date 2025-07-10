// src/app/verify/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      console.log("🔗 Redirecting from /verify to /login with token:", token);
      // Redirect to login page with the token
      router.replace(`/login?token=${token}`);
    } else {
      console.log("❌ No token found, redirecting to login");
      // No token, just go to login
      router.replace("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Processing magic link...</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthVerifyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get all search params and redirect to the correct verify page
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const redirect = searchParams.get("redirect");

    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (email) params.set("email", email);
    if (redirect) params.set("redirect", redirect);

    console.log(
      "Redirecting from /auth/verify to /verify with params:",
      params.toString()
    );

    // Redirect to the actual verify page
    router.replace(`/verify?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto">
          <Loader2 className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-semibold">
          Redirecting to verification...
        </h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we verify your magic link
        </p>
      </div>
    </div>
  );
}

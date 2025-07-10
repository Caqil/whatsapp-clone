// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, QrCode, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { QRCodeScanner } from "@/components/auth/qr-code-scanner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [loginMethod, setLoginMethod] = useState<"magic-link" | "qr-code">(
    "magic-link"
  );

  // Get initial tab from URL params
  const initialTab =
    (searchParams.get("method") as "magic-link" | "qr-code") || "magic-link";

  useEffect(() => {
    setLoginMethod(initialTab);
  }, [initialTab]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle login method change
  const handleMethodChange = (value: string) => {
    if (value === "magic-link" || value === "qr-code") {
      setLoginMethod(value);

      // Update URL without causing re-render
      const url = new URL(window.location.href);
      url.searchParams.set("method", value);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Don't render if loading or authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="text-muted-foreground">
          Choose your preferred way to sign in
        </p>
      </div>

      {/* Auth Tabs */}
      <Tabs
        value={loginMethod}
        onValueChange={handleMethodChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="magic-link" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Magic Link</span>
            <span className="sm:hidden">Email</span>
          </TabsTrigger>
          <TabsTrigger value="qr-code" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR Code</span>
            <span className="sm:hidden">QR</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="magic-link" className="space-y-4">
          <MagicLinkForm
            onSuccess={() => {}}
            onSwitchToQR={() => setLoginMethod("qr-code")}
          />
        </TabsContent>

        <TabsContent value="qr-code" className="space-y-4">
          <QRCodeScanner
            onSuccess={() => router.push("/")}
            onSwitchToMagicLink={() => setLoginMethod("magic-link")}
          />
        </TabsContent>
      </Tabs>

      {/* How it Works */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loginMethod === "magic-link" ? (
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </span>
                Enter your email address
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </span>
                We'll send you a secure link
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </span>
                Click the link to sign in instantly
              </li>
            </ol>
          ) : (
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </span>
                Open WhatsApp on your phone
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </span>
                Go to Settings → Linked Devices
              </li>
              <li className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </span>
                Scan the QR code above
              </li>
            </ol>
          )}

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {loginMethod === "magic-link"
                ? "Magic links expire after 15 minutes for security"
                : "QR codes expire after 5 minutes for security"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

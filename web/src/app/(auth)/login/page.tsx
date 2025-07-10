// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  QrCode,
  Smartphone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { QRCodeScanner } from "@/components/auth/qr-code-scanner";
import { APP_CONFIG } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [loginMethod, setLoginMethod] = useState<"magic-link" | "qr-code">(
    "magic-link"
  );
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

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

  // Handle magic link sent
  const handleMagicLinkSent = (email: string) => {
    setEmailSent(true);
    setSentEmail(email);
  };

  // Handle login method change
  const handleMethodChange = (value: string) => {
    if (value === "magic-link" || value === "qr-code") {
      setLoginMethod(value);
      setEmailSent(false);
      setSentEmail("");

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
      {/* Page header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">
          Choose your preferred way to sign in
        </p>
      </div>

      {/* Login methods tabs */}
      <Tabs
        value={loginMethod}
        onValueChange={handleMethodChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="magic-link" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Magic Link
          </TabsTrigger>
          <TabsTrigger value="qr-code" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </TabsTrigger>
        </TabsList>

        {/* Magic Link Login */}
        <TabsContent value="magic-link" className="space-y-4">
          {emailSent ? (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Check your email</CardTitle>
                <CardDescription>
                  We've sent a magic link to <strong>{sentEmail}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Click the link in your email to sign in. The link will
                    expire in 15 minutes.
                  </p>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                      Don't see the email? Check your spam folder or
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmailSent(false);
                        setSentEmail("");
                      }}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Try again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <MagicLinkForm
              onSuccess={() => {
                // This will be handled by the auth hook redirecting
                router.push("/");
              }}
              onSwitchToQR={() => handleMethodChange("qr-code")}
              defaultEmail={searchParams.get("email") || ""}
            />
          )}
        </TabsContent>

        {/* QR Code Login */}
        <TabsContent value="qr-code" className="space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Smartphone className="h-5 w-5" />
                Sign in with your phone
              </CardTitle>
              <CardDescription>
                Scan the QR code with your mobile WhatsApp to log in instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QRCodeScanner
                onSwitchToMagicLink={() => handleMethodChange("magic-link")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* How it works info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <h3 className="font-medium flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              How it works
            </h3>

            {loginMethod === "magic-link" ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Enter your email address</p>
                <p>2. Check your email for a secure login link</p>
                <p>3. Click the link to sign in instantly</p>
                <p className="text-xs pt-2 border-t">
                  No passwords needed. The link expires after 15 minutes for
                  security.
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Open WhatsApp on your mobile device</p>
                <p>2. Go to Settings → Linked Devices</p>
                <p>3. Scan the QR code displayed above</p>
                <p className="text-xs pt-2 border-t">
                  Your phone must be connected to the internet to use this
                  feature.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* First time user */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          First time using {APP_CONFIG.NAME}?
        </p>
        <p className="text-xs text-muted-foreground">
          Don't worry! The magic link will help you create an account
          automatically.
        </p>
      </div>

      {/* Alternative options */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Need help?
          </span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <div className="space-y-1">
          <Link href="/help" className="text-sm text-primary hover:underline">
            View help documentation
          </Link>
        </div>
        <div className="space-y-1">
          <Link
            href="/contact"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Contact support
          </Link>
        </div>
      </div>

      {/* Beta notice (if applicable) */}
      {process.env.NODE_ENV === "development" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Development Mode:</strong> This is a demo version. Magic
            links will be logged to the console in development.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

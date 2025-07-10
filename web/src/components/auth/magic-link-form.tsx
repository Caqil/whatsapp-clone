// src/components/auth/magic-link-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const magicLinkRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  deviceType: z.enum(["web", "mobile", "desktop"]),
  deviceName: z.string(),
});

interface MagicLinkFormProps {
  onSuccess?: (email: string) => void;
  onSwitchToQR?: () => void;
  className?: string;
  defaultEmail?: string;
}

type FormData = z.infer<typeof magicLinkRequestSchema>;
type FormState = "idle" | "sending" | "sent" | "error";

export function MagicLinkForm({
  onSuccess,
  onSwitchToQR,
  className,
  defaultEmail,
}: MagicLinkFormProps) {
  const { sendMagicLink, isLoading, error } = useAuth();
  const [formState, setFormState] = useState<FormState>("idle");
  const [sentEmail, setSentEmail] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);

  const form = useForm<FormData>({
    resolver: zodResolver(magicLinkRequestSchema),
    defaultValues: {
      email: defaultEmail || "",
      deviceType: "web",
      deviceName: "Web Browser",
    },
  });

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    let deviceName = "Web Browser";

    if (/mobile|android|iphone|ipad|phone|tablet/.test(userAgent)) {
      deviceName = "Mobile Device";
      form.setValue("deviceType", "mobile");
    } else if (/electron/.test(userAgent)) {
      deviceName = "Desktop App";
      form.setValue("deviceType", "desktop");
    }

    form.setValue("deviceName", deviceName);
  }, [form]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: FormData) => {
    try {
      setFormState("sending");
      console.log("🔄 Sending magic link to:", data.email);

      const response = await sendMagicLink(data);

      console.log("✅ Magic link sent successfully:", response);
      setFormState("sent");
      setSentEmail(data.email);
      setCountdown(60); // 60 second cooldown

      onSuccess?.(data.email);
    } catch (error) {
      console.error("❌ Failed to send magic link:", error);
      setFormState("error");
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;

    setFormState("idle");
    form.handleSubmit(onSubmit)();
  };

  const handleChangeEmail = () => {
    setFormState("idle");
    setSentEmail("");
    setCountdown(0);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            {formState === "sending" ? (
              <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : formState === "sent" ? (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : formState === "error" ? (
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            ) : (
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          <CardTitle>
            {formState === "sent"
              ? "Check Your Email"
              : "Sign in with Magic Link"}
          </CardTitle>

          <CardDescription>
            {formState === "sent"
              ? `We've sent a secure login link to ${sentEmail}`
              : "Well send a secure link to your email. No password required!"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {formState === "sent" ? (
            // Success state
            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Check your email!</strong> We've sent a magic link to{" "}
                  <strong>{sentEmail}</strong>. Click the link to sign in
                  instantly.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground text-center">
                  <div className="space-y-1">
                    <p>• Check your inbox (and spam folder)</p>
                    <p>• Click the "Sign In Securely" button</p>
                    <p>• The link expires in 15 minutes</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleResend}
                    variant="outline"
                    disabled={countdown > 0}
                    className="flex-1"
                  >
                    {countdown > 0 ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend in {countdown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend Link
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleChangeEmail}
                    variant="ghost"
                    className="flex-1"
                  >
                    Change Email
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Form state
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  {...form.register("email")}
                  disabled={formState === "sending"}
                  className={cn(
                    form.formState.errors.email && "border-destructive"
                  )}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Show error if any */}
              {formState === "error" && error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.message ||
                      "Failed to send magic link. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={formState === "sending" || isLoading}
                size="lg"
              >
                {formState === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Magic Link...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Magic Link
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Additional info */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>🔐 Secure • 🚀 Fast • 🔑 No passwords</p>
              <p>The link will expire in 15 minutes for security</p>
            </div>
          </div>

          {/* Switch to QR code option */}
          {onSwitchToQR && formState !== "sent" && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Prefer to scan a QR code?
              </p>
              <Button
                variant="outline"
                onClick={onSwitchToQR}
                size="sm"
                disabled={formState === "sending"}
              >
                Use QR Code Instead
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Development debug info */}
      {process.env.NODE_ENV === "development" && formState === "sent" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Mode:</strong> Check your server console for the
            magic link if email delivery is not configured.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

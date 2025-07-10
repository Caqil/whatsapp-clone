// src/components/auth/magic-link-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Smartphone,
  Monitor,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { magicLinkRequestSchema } from "@/lib/validation";
import type { MagicLinkRequest, DeviceType } from "@/types/auth";

interface MagicLinkFormProps {
  onSuccess?: () => void;
  onSwitchToQR?: () => void;
  
  className?: string;
  showBackButton?: boolean;
  defaultEmail?: string;
}

type FormData = z.infer<typeof magicLinkRequestSchema>;

const deviceIcons = {
  web: Monitor,
  mobile: Smartphone,
  desktop: Monitor,
};

export function MagicLinkForm({
  onSuccess,
  onSwitchToQR,
  className,
  showBackButton = false,
  defaultEmail = "",
}: MagicLinkFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendMagicLink, isLoading, error } = useAuth();

  const [step, setStep] = useState<"form" | "sent" | "success">("form");
  const [sentEmail, setSentEmail] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("web");
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(magicLinkRequestSchema),
    defaultValues: {
      email: defaultEmail || searchParams.get("email") || "",
      deviceType: "web",
      deviceName: "",
    },
  });

  // Auto-detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    let detectedDevice: DeviceType = "web";

    if (/mobile|android|iphone|ipad|ipod|blackberry|webos/.test(userAgent)) {
      detectedDevice = "mobile";
    } else if (/electron/.test(userAgent)) {
      detectedDevice = "desktop";
    }

    setDeviceType(detectedDevice);
    form.setValue("deviceType", detectedDevice);

    // Set default device name
    const deviceName =
      detectedDevice === "mobile"
        ? "Mobile Device"
        : detectedDevice === "desktop"
        ? "Desktop App"
        : "Web Browser";
    form.setValue("deviceName", deviceName);
  }, [form]);

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown((prev) => prev - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: FormData) => {
    try {
      await sendMagicLink(data);
      setSentEmail(data.email);
      setStep("sent");
      setResendCooldown(60); // 60 second cooldown
      onSuccess?.();
    } catch (error) {
      console.error("Failed to send magic link:", error);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      const currentValues = form.getValues();
      await sendMagicLink(currentValues);
      setResendCooldown(60);
    } catch (error) {
      console.error("Failed to resend magic link:", error);
    }
  };

  const handleBack = () => {
    if (step === "sent") {
      setStep("form");
    } else {
      router.back();
    }
  };

  if (step === "sent") {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription className="mt-2">
                We sent a magic link to <strong>{sentEmail}</strong>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Click the link in your email to sign in. The link will expire in
                15 minutes.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  "Resend magic link"
                )}
              </Button>

              <Button variant="ghost" onClick={handleBack} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to form
              </Button>
            </div>

            {onSwitchToQR && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  onClick={onSwitchToQR}
                  className="w-full"
                >
                  Try QR Code instead
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sign in with magic link</CardTitle>
              <CardDescription className="mt-2">
                Enter your email and we'll send you a secure link to sign in
              </CardDescription>
            </div>
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Device type indicator */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Device:</Label>
            <Badge variant="secondary" className="gap-1.5">
              {React.createElement(deviceIcons[deviceType], {
                className: "h-3 w-3",
              })}
              {deviceType === "web"
                ? "Web Browser"
                : deviceType === "mobile"
                ? "Mobile Device"
                : "Desktop App"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register("email")}
                className={cn(
                  form.formState.errors.email && "border-destructive"
                )}
                disabled={isLoading}
                autoFocus
                autoComplete="email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Hidden device fields */}
            <input type="hidden" {...form.register("deviceType")} />
            <input type="hidden" {...form.register("deviceName")} />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{typeof error === "string" ? error : error?.message ?? String(error)}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending magic link...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send magic link
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alternative login methods */}
      {onSwitchToQR && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Or sign in with your mobile device
              </p>
              <Button
                variant="outline"
                onClick={onSwitchToQR}
                className="w-full"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Use QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          Don't have an account? The magic link will help you create one.
        </p>
        <p className="text-xs text-muted-foreground">
          Magic links expire after 15 minutes for security.
        </p>
      </div>
    </div>
  );
}

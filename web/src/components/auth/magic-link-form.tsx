// src/components/auth/magic-link-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, Smartphone, Monitor, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { magicLinkRequestSchema } from "@/lib/validation";
import type { MagicLinkRequest, DeviceType } from "@/types/auth";

interface MagicLinkFormProps {
  onSuccess?: (email: string) => void;
  onSwitchToQR?: () => void;
  className?: string;
  defaultEmail?: string;
}

type FormData = z.infer<typeof magicLinkRequestSchema>;

export function MagicLinkForm({
  onSuccess,
  onSwitchToQR,
  className,
  defaultEmail,
}: MagicLinkFormProps) {
  const { sendMagicLink, isLoading, error } = useAuth();
  const [deviceType, setDeviceType] = useState<DeviceType>("web");

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
    let detectedType: DeviceType = "web";
    let deviceName = "Web Browser";

    if (/mobile|android|iphone|ipad|phone|tablet/.test(userAgent)) {
      detectedType = "mobile";
      deviceName = "Mobile Device";
    } else if (/electron/.test(userAgent)) {
      detectedType = "desktop";
      deviceName = "Desktop App";
    }

    setDeviceType(detectedType);
    form.setValue("deviceType", detectedType);
    form.setValue("deviceName", deviceName);
  }, [form]);

  const onSubmit = async (data: FormData) => {
    try {
      const response = await sendMagicLink(data);
      console.log("Magic link sent successfully:", response);
      onSuccess?.(data.email);
    } catch (error) {
      console.error("Failed to send magic link:", error);
      // Error is handled by the useAuth hook
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Sign in with Magic Link</CardTitle>
          <CardDescription>
            We'll send a secure link to your email. No password required!
          </CardDescription>

          <div className="flex justify-center">
            <Badge variant="secondary" className="flex items-center gap-2">
              {deviceType === "web" ? (
                <Monitor className="h-3 w-3" />
              ) : deviceType === "mobile" ? (
                <Smartphone className="h-3 w-3" />
              ) : (
                <Monitor className="h-3 w-3" />
              )}
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
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {typeof error === "string"
                    ? error
                    : error?.message ?? String(error)}
                </AlertDescription>
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

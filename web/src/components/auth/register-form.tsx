// src/components/auth/register-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Phone,
  AtSign,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { magicLinkUserRegistrationSchema } from "@/lib/validation";
import type { MagicLinkUserRequest } from "@/types/auth";

interface RegisterFormProps {
  token?: string;
  onSuccess?: () => void;
  onBack?: () => void;
  className?: string;
  showBackButton?: boolean;
  defaultValues?: Partial<MagicLinkUserRequest>;
}

type FormData = z.infer<typeof magicLinkUserRegistrationSchema>;

export function RegisterForm({
  token,
  onSuccess,
  onBack,
  className,
  showBackButton = false,
  defaultValues,
}: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerWithMagicLink, verifyMagicLink, isLoading, error } =
    useAuth();

  const [step, setStep] = useState<"form" | "success">("form");
  const [previewAvatar, setPreviewAvatar] = useState<string>("");

  // Get token from URL params if not provided
  const authToken = token || searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const form = useForm<FormData>({
    resolver: zodResolver(magicLinkUserRegistrationSchema),
    defaultValues: {
      email: emailFromUrl || defaultValues?.email || "",
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      username: defaultValues?.username || "",
      phone: defaultValues?.phone || "",
      bio: defaultValues?.bio || "",
      ...defaultValues,
    },
  });

  // Watch form values for avatar preview
  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");

  // Generate avatar preview from initials
  useEffect(() => {
    if (firstName || lastName) {
      const initials = `${firstName.charAt(0)}${lastName.charAt(
        0
      )}`.toUpperCase();
      setPreviewAvatar(initials);
    }
  }, [firstName, lastName]);

  // Auto-generate username from name
  useEffect(() => {
    if (firstName && lastName && !form.getValues("username")) {
      const suggested = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.random()
        .toString(36)
        .substr(2, 2)}`;
      form.setValue("username", suggested);
    }
  }, [firstName, lastName, form]);

  const onSubmit = async (data: FormData) => {
    if (!authToken) {
      console.error("No authentication token provided");
      return;
    }

    try {
      await registerWithMagicLink(authToken, data);
      setStep("success");
      onSuccess?.();
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const generateUsername = () => {
    const base =
      firstName && lastName
        ? `${firstName.toLowerCase()}${lastName.toLowerCase()}`
        : "user";
    const random = Math.random().toString(36).substr(2, 4);
    form.setValue("username", `${base}${random}`);
  };

  if (step === "success") {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle>Welcome to WhatsApp Clone!</CardTitle>
              <CardDescription className="mt-2">
                Your account has been created successfully. You're now signed
                in.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <Avatar className="h-16 w-16 mx-auto mb-4">
                <AvatarFallback className="text-lg font-semibold">
                  {previewAvatar}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium">
                {firstName} {lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                @{form.getValues("username")}
              </p>
            </div>

            <Button onClick={() => router.push("/")} className="w-full">
              Continue to WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardHeader>
            <CardTitle>Invalid Registration Link</CardTitle>
            <CardDescription>
              The registration link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Back to Sign In
            </Button>
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
              <CardTitle>Complete your profile</CardTitle>
              <CardDescription className="mt-2">
                Tell us a bit about yourself to get started
              </CardDescription>
            </div>
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Avatar preview */}
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl font-bold">
                {previewAvatar || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  className="pl-10"
                  disabled
                  readOnly
                />
              </div>
              <Badge variant="secondary" className="text-xs">
                Verified via magic link
              </Badge>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...form.register("firstName")}
                  className={cn(
                    form.formState.errors.firstName && "border-destructive"
                  )}
                  disabled={isLoading}
                  autoFocus
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...form.register("lastName")}
                  className={cn(
                    form.formState.errors.lastName && "border-destructive"
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="johndoe"
                    {...form.register("username")}
                    className={cn(
                      "pl-10",
                      form.formState.errors.username && "border-destructive"
                    )}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateUsername}
                  disabled={isLoading || !firstName || !lastName}
                  className="shrink-0"
                >
                  Generate
                </Button>
              </div>
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Choose a unique username. Others can find you by this name.
              </p>
            </div>

            {/* Phone (optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...form.register("phone")}
                  className={cn(
                    "pl-10",
                    form.formState.errors.phone && "border-destructive"
                  )}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            {/* Bio (optional) */}
            <div className="space-y-2">
              <Label htmlFor="bio">About (optional)</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="bio"
                  placeholder="Hey there! I am using WhatsApp."
                  {...form.register("bio")}
                  className={cn(
                    "pl-10 min-h-[80px] resize-none",
                    form.formState.errors.bio && "border-destructive"
                  )}
                  disabled={isLoading}
                  maxLength={139}
                />
              </div>
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.bio.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {form.watch("bio")?.length || 0}/139 characters
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{typeof error === "string" ? error : error?.message || String(error)}</AlertDescription>
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
                  Creating account...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Terms note */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy.
        </p>
      </div>
    </div>
  );
}

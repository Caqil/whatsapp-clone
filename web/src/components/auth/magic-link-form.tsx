"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type MagicLinkStep = "email" | "checking" | "register" | "complete" | "error";

interface MagicLinkState {
  step: MagicLinkStep;
  email: string;
  token: string | null;
  error: string | null;
  isLoading: boolean;
  requiresRegistration: boolean;
}

export function MagicLinkAuth() {
  const [state, setState] = useState<MagicLinkState>({
    step: "email",
    email: "",
    token: null,
    error: null,
    isLoading: false,
    requiresRegistration: false,
  });

  const [registrationData, setRegistrationData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendMagicLink, verifyMagicLink, registerWithMagicLink, clearError } =
    useAuth();

  // Check for magic link token in URL params
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      console.log("🔗 Magic link token found in URL:", token);
      setState((prev) => ({ ...prev, step: "checking", token }));
      handleVerifyToken(token);
    }
  }, [searchParams]);

  const updateState = (updates: Partial<MagicLinkState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      console.log("📧 Sending magic link to:", state.email.trim());

      await sendMagicLink(state.email.trim());

      updateState({
        step: "checking",
        isLoading: false,
      });

      toast.success("Magic link sent! Check your email.");
    } catch (error: any) {
      console.error("❌ Failed to send magic link:", error);

      const errorMessage =
        error.response?.data?.message || "Failed to send magic link";
      updateState({
        isLoading: false,
        error: errorMessage,
        step: "error",
      });
    }
  };

  const handleVerifyToken = async (token: string) => {
    try {
      updateState({ isLoading: true, error: null });

      console.log("🔍 Verifying magic link token:", token);

      const response = await verifyMagicLink(token);

      console.log("✅ Magic link verification successful:", response);

      updateState({
        step: "complete",
        isLoading: false,
      });

      toast.success("Successfully logged in!");

      // Wait longer to ensure auth state is fully set
      setTimeout(() => {
        console.log("🚀 Redirecting to chat...");
        router.push("/chat");
      }, 2000);
    } catch (error: any) {
      console.error("❌ Magic link verification failed:", error);

      if (error.requiresRegistration) {
        console.log("📝 Registration required");
        updateState({
          step: "register",
          token: error.token,
          isLoading: false,
          requiresRegistration: true,
        });
      } else {
        const errorMessage =
          error.response?.data?.message || "Invalid or expired magic link";
        updateState({
          step: "error",
          isLoading: false,
          error: errorMessage,
        });
      }
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !registrationData.username.trim() ||
      !registrationData.firstName.trim()
    ) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!state.token) {
      toast.error("Registration token missing");
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      console.log("📝 Registering with magic link:", registrationData);

      await registerWithMagicLink(state.token, {
        username: registrationData.username.trim(),
        firstName: registrationData.firstName.trim(),
        lastName: registrationData.lastName.trim(),
        phone: registrationData.phone.trim() || undefined,
        bio: registrationData.bio.trim() || undefined,
      });

      updateState({
        step: "complete",
        isLoading: false,
      });

      toast.success("Account created successfully!");

      // Add a delay to show the success message, then redirect
      setTimeout(() => {
        console.log("🚀 Redirecting to chat...");
        router.push("/chat");
      }, 1500);
    } catch (error: any) {
      console.error("❌ Registration failed:", error);

      const errorMessage =
        error.response?.data?.message || "Registration failed";
      updateState({
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retrying magic link auth");

    clearError();
    updateState({
      step: "email",
      error: null,
      token: null,
      requiresRegistration: false,
    });
  };

  const renderEmailStep = () => (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <Mail className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-6 text-3xl font-bold text-gray-900">
          Sign in with Magic Link
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email and we'll send you a secure login link
        </p>
      </div>

      <form onSubmit={handleSendMagicLink} className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email address"
            value={state.email}
            onChange={(e) => updateState({ email: e.target.value })}
            disabled={state.isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={state.isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Sending...
            </>
          ) : (
            "Send Magic Link"
          )}
        </button>
      </form>
    </div>
  );

  const renderCheckingStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
      <h2 className="text-2xl font-bold text-gray-900">
        Checking your link...
      </h2>
      <p className="text-gray-600">
        Please wait while we verify your magic link
      </p>
    </div>
  );

  const renderRegistrationStep = () => (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          Complete Your Registration
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We need a few more details to create your account
        </p>
      </div>

      <form onSubmit={handleRegistration} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={registrationData.firstName}
              onChange={(e) =>
                setRegistrationData((prev) => ({
                  ...prev,
                  firstName: e.target.value,
                }))
              }
              disabled={state.isLoading}
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={registrationData.lastName}
              onChange={(e) =>
                setRegistrationData((prev) => ({
                  ...prev,
                  lastName: e.target.value,
                }))
              }
              disabled={state.isLoading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username *
          </label>
          <input
            id="username"
            type="text"
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Choose a unique username"
            value={registrationData.username}
            onChange={(e) =>
              setRegistrationData((prev) => ({
                ...prev,
                username: e.target.value,
              }))
            }
            disabled={state.isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1 (555) 123-4567"
            value={registrationData.phone}
            onChange={(e) =>
              setRegistrationData((prev) => ({
                ...prev,
                phone: e.target.value,
              }))
            }
            disabled={state.isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700"
          >
            Bio (optional)
          </label>
          <textarea
            id="bio"
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us about yourself..."
            value={registrationData.bio}
            onChange={(e) =>
              setRegistrationData((prev) => ({
                ...prev,
                bio: e.target.value,
              }))
            }
            disabled={state.isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={state.isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
      <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
      <p className="text-gray-600">
        You have been successfully authenticated. Redirecting to chat...
      </p>
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">Redirecting...</span>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <XCircle className="mx-auto h-12 w-12 text-red-600" />
      <h2 className="text-2xl font-bold text-gray-900">
        Authentication Failed
      </h2>
      <p className="text-red-600">{state.error}</p>
      <button
        onClick={handleRetry}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="w-full">
      {state.step === "email" && renderEmailStep()}
      {state.step === "checking" && renderCheckingStep()}
      {state.step === "register" && renderRegistrationStep()}
      {state.step === "complete" && renderCompleteStep()}
      {state.step === "error" && renderErrorStep()}
    </div>
  );
}

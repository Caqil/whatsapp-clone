"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Smartphone,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type QRCodeStep =
  | "generate"
  | "display"
  | "waiting"
  | "scanned"
  | "complete"
  | "expired"
  | "error";

interface QRCodeState {
  step: QRCodeStep;
  qrCode: string | null;
  secret: string | null;
  expiresAt: string | null;
  error: string | null;
  isLoading: boolean;
  timeRemaining: number;
}

export function QRCodeAuth() {
  const [state, setState] = useState<QRCodeState>({
    step: "generate",
    qrCode: null,
    secret: null,
    expiresAt: null,
    error: null,
    isLoading: false,
    timeRemaining: 0,
  });

  const { generateQRCode, checkQRStatus, loginWithQRCode } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = (updates: Partial<QRCodeState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Detect browser
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    // Detect OS
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    return `${browser} on ${os}`;
  };

  const startCountdown = (expiresAt: string) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

      updateState({ timeRemaining: remaining });

      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!);
        updateState({ step: "expired" });
        stopPolling();
      }
    };

    updateTimeRemaining();
    countdownIntervalRef.current = setInterval(updateTimeRemaining, 1000);
  };

  const startPolling = (secret: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await checkQRStatus(secret);

        switch (statusResponse.status) {
          case "scanned":
            updateState({ step: "scanned" });
            break;
          case "used":
            stopPolling();
            await handleLogin(secret);
            break;
          case "expired":
            updateState({ step: "expired" });
            stopPolling();
            break;
        }
      } catch (error) {
        console.error("QR status polling error:", error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleGenerateQR = async () => {
    try {
      updateState({ isLoading: true, error: null });

      const deviceInfo = getDeviceInfo();
      const response = await generateQRCode(deviceInfo, "web");

      updateState({
        step: "display",
        qrCode: response.qrCode,
        secret: response.secret,
        expiresAt: response.expiresAt,
        isLoading: false,
      });

      // Start polling for status
      startPolling(response.secret);
      startCountdown(response.expiresAt);

      // Update to waiting step after a short delay
      setTimeout(() => {
        updateState({ step: "waiting" });
      }, 1000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to generate QR code";
      updateState({
        step: "error",
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  const handleLogin = async (secret: string) => {
    try {
      updateState({ isLoading: true });

      await loginWithQRCode(secret);

      updateState({
        step: "complete",
        isLoading: false,
      });

      // Redirect to chat after a short delay
      setTimeout(() => {
        window.location.href = "/chat";
      }, 1500);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "QR code login failed";
      updateState({
        step: "error",
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  const handleRetry = () => {
    stopPolling();
    updateState({
      step: "generate",
      qrCode: null,
      secret: null,
      expiresAt: null,
      error: null,
      timeRemaining: 0,
    });
    handleGenerateQR();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Generate QR code on mount
  useEffect(() => {
    handleGenerateQR();

    return () => {
      stopPolling();
    };
  }, []);

  const renderGenerateStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
      <h2 className="text-2xl font-bold text-gray-900">
        Generating QR Code...
      </h2>
      <p className="text-gray-600">
        Please wait while we create your login QR code
      </p>
    </div>
  );

  const renderDisplayStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <QrCode className="mx-auto h-12 w-12 text-blue-600" />
      <h2 className="text-2xl font-bold text-gray-900">QR Code Ready</h2>
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        {state.qrCode && (
          <img
            src={`data:image/png;base64,${state.qrCode}`}
            alt="QR Code"
            className="mx-auto w-48 h-48"
          />
        )}
      </div>
      <p className="text-gray-600">Scan this QR code with your mobile device</p>
    </div>
  );

  const renderWaitingStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <div className="text-center">
        <Smartphone className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Scan QR Code</h2>
        <p className="mt-2 text-gray-600">
          Use your mobile device to scan the QR code below
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
        {state.qrCode && (
          <img
            src={`data:image/png;base64,${state.qrCode}`}
            alt="QR Code"
            className="mx-auto w-48 h-48"
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Waiting for scan...</span>
        </div>

        {state.timeRemaining > 0 && (
          <p className="text-xs text-gray-500">
            Expires in {formatTime(state.timeRemaining)}
          </p>
        )}
      </div>

      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex items-center justify-center space-x-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            1
          </span>
          <span>Open WhatsApp on your mobile device</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            2
          </span>
          <span>Tap on "Scan QR Code" option</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            3
          </span>
          <span>Point your camera at this QR code</span>
        </div>
      </div>

      <button
        onClick={handleRetry}
        className="flex items-center justify-center space-x-2 mx-auto px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Generate New QR Code</span>
      </button>
    </div>
  );

  const renderScannedStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
      <h2 className="text-2xl font-bold text-gray-900">QR Code Scanned!</h2>
      <p className="text-gray-600">
        Please confirm the login on your mobile device
      </p>
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">
          Waiting for confirmation...
        </span>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
      <h2 className="text-2xl font-bold text-gray-900">Login Successful!</h2>
      <p className="text-gray-600">You have been successfully authenticated</p>
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">Redirecting to chat...</span>
      </div>
    </div>
  );

  const renderExpiredStep = () => (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      <XCircle className="mx-auto h-12 w-12 text-orange-600" />
      <h2 className="text-2xl font-bold text-gray-900">QR Code Expired</h2>
      <p className="text-gray-600">
        The QR code has expired. Please generate a new one to continue.
      </p>
      <button
        onClick={handleRetry}
        className="w-full flex justify-center items-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Generate New QR Code</span>
      </button>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {state.step === "generate" && renderGenerateStep()}
        {state.step === "display" && renderDisplayStep()}
        {state.step === "waiting" && renderWaitingStep()}
        {state.step === "scanned" && renderScannedStep()}
        {state.step === "complete" && renderCompleteStep()}
        {state.step === "expired" && renderExpiredStep()}
        {state.step === "error" && renderErrorStep()}
      </div>
    </div>
  );
}

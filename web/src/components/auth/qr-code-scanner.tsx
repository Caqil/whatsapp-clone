// src/components/auth/qr-code-scanner.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Smartphone,
  Monitor,
  CheckCircle,
  AlertCircle,
  Timer,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  QRCodeRequest,
  QRCodeResponse,
  DeviceType,
  MagicLinkStatus,
} from "@/types/auth";

interface QRCodeScannerProps {
  onSuccess?: () => void;
  onSwitchToMagicLink?: () => void;
  className?: string;
  showBackButton?: boolean;
}

export function QRCodeScanner({
  onSuccess,
  onSwitchToMagicLink,
  className,
  showBackButton = false,
}: QRCodeScannerProps) {
  const router = useRouter();
  const { generateQRCode, checkQRStatus, loginWithQRCode, isLoading, error } =
    useAuth();

  const [qrData, setQrData] = useState<QRCodeResponse | null>(null);
  const [status, setStatus] = useState<MagicLinkStatus>("pending");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [deviceType] = useState<DeviceType>("web");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Generate QR code on mount
  useEffect(() => {
    generateQR();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Start countdown timer
  useEffect(() => {
    if (qrData) {
      const expiresAt = new Date(qrData.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining > 0) {
        countdownRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            const newTime = prev - 1;
            if (newTime <= 0) {
              setIsExpired(true);
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              return 0;
            }
            return newTime;
          });
        }, 1000);
      } else {
        setIsExpired(true);
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [qrData]);

  const generateQR = async () => {
    try {
      setIsExpired(false);
      setStatus("pending");

      const request: QRCodeRequest = {
        deviceType,
        deviceName: "Web Browser",
      };

      const response = await generateQRCode(request);
      setQrData(response);
      startPolling(response.secret);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const startPolling = (secret: string) => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Poll for QR status every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await checkQRStatus(secret);
        setStatus(statusResponse.status);

        if (statusResponse.status === "used" && statusResponse.user) {
          // QR code was scanned and user is authenticated
          clearInterval(pollIntervalRef.current!);

          try {
            await loginWithQRCode(secret);
            setStatus("used");
            onSuccess?.();
          } catch (loginError) {
            console.error("Failed to complete QR login:", loginError);
            setStatus("expired");
          }
        } else if (
          statusResponse.status === "expired" ||
          statusResponse.status === "cancelled"
        ) {
          clearInterval(pollIntervalRef.current!);
          setIsExpired(true);
        }
      } catch (error) {
        console.error("Failed to check QR status:", error);
      }
    }, 2000);
  };

  const handleRefresh = () => {
    generateQR();
  };

  const handleBack = () => {
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "bg-blue-500";
      case "used":
        return "bg-green-500";
      case "expired":
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getProgressValue = () => {
    if (!qrData) return 0;
    const totalTime = 5 * 60; // 5 minutes in seconds
    return ((totalTime - timeRemaining) / totalTime) * 100;
  };

  return (
    <div className={cn("space-y-6 max-w-md mx-auto", className)}>
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Sign in with QR Code</CardTitle>
              <CardDescription className="mt-2">
                Scan this code with your mobile device to sign in
              </CardDescription>
            </div>
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
            <span className="text-sm text-muted-foreground capitalize">
              {status === "pending" ? "Waiting for scan" : status}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="relative">
            <div className="aspect-square bg-white rounded-lg p-4 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Generating...</p>
                </div>
              ) : qrData && !isExpired ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={qrData.qrCode}
                    alt="QR Code for authentication"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-center">
                  <QrCode className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isExpired
                      ? "QR Code expired"
                      : "Failed to generate QR code"}
                  </p>
                </div>
              )}
            </div>

            {/* Overlay for expired/scanned states */}
            {(isExpired || status === "used") && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  {status === "used" ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                      <p className="text-sm font-medium">
                        Successfully scanned!
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="text-sm font-medium">QR Code expired</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timer and Progress */}
          {qrData && !isExpired && status !== "used" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time remaining</span>
                <Badge variant="outline" className="gap-1">
                  <Timer className="h-3 w-3" />
                  {formatTime(timeRemaining)}
                </Badge>
              </div>
              <Progress value={getProgressValue()} className="h-2" />
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {(isExpired || error) && (
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate new QR code
                  </>
                )}
              </Button>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{typeof error === "string" ? error : error?.message ?? String(error)}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-4 text-sm text-muted-foreground">
            <Separator />
            <div>
              <h4 className="font-medium text-foreground mb-2">How to scan:</h4>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Open WhatsApp on your mobile device</li>
                <li>Go to Settings → Linked Devices</li>
                <li>Tap "Link a Device"</li>
                <li>Point your camera at this QR code</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative sign in method */}
      {onSwitchToMagicLink && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Having trouble? Try signing in with email instead
              </p>
              <Button
                variant="outline"
                onClick={onSwitchToMagicLink}
                className="w-full"
              >
                <Monitor className="mr-2 h-4 w-4" />
                Use magic link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security note */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          QR codes expire after 5 minutes for security.
        </p>
        <p className="text-xs text-muted-foreground">
          Only scan this code if you trust this device.
        </p>
      </div>
    </div>
  );
}

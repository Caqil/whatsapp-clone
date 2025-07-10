"use client";

import { QRCodeAuth } from "@/components/auth/qr-code-auth";
import React from "react";

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <QRCodeAuth />
    </div>
  );
}

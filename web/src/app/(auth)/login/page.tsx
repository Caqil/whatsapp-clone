"use client";

import { AuthTabs } from "@/components/auth/auth-tabs";
import React from "react";
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <AuthTabs />
    </div>
  );
}

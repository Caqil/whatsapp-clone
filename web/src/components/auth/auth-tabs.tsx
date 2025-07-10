"use client";

import React, { useState } from "react";
import { Mail, QrCode, Lock } from "lucide-react";
import { MagicLinkAuth } from "./magic-link-form";
import { QRCodeAuth } from "./qr-code-auth";

type AuthMethod = "magic_link" | "qr_code" | "password";

interface AuthTab {
  id: AuthMethod;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const authTabs: AuthTab[] = [
  {
    id: "magic_link",
    label: "Magic Link",
    icon: Mail,
    description: "Sign in with a secure link sent to your email",
  },
  {
    id: "qr_code",
    label: "QR Code",
    icon: QrCode,
    description: "Scan QR code with your mobile device",
  },
  {
    id: "password",
    label: "Password",
    icon: Lock,
    description: "Traditional email and password login",
  },
];

// Simple Password Auth Component (for legacy support)
function PasswordAuth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <Lock className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-6 text-3xl font-bold text-gray-900">
          {isLogin ? "Sign in to your account" : "Create new account"}
        </h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Recommended:</strong> Use Magic Link or QR Code for a more
          secure and convenient login experience.
        </p>
      </div>

      <form className="space-y-4">
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email address"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />

        {!isLogin && (
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isLogin ? "Sign In" : "Create Account"}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isLogin
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export function AuthTabs() {
  const [activeTab, setActiveTab] = useState<AuthMethod>("magic_link");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-center text-gray-900">
            WhatsApp Clone
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Choose your preferred sign-in method
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          {authTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Tab Description */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {authTabs.find((tab) => tab.id === activeTab)?.description}
            </p>
          </div>

          {/* Auth Components */}
          {activeTab === "magic_link" && <MagicLinkAuth />}
          {activeTab === "qr_code" && <QRCodeAuth />}
          {activeTab === "password" && <PasswordAuth />}
        </div>
      </div>
    </div>
  );
}

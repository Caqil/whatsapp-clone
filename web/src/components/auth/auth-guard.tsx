// src/components/auth/auth-guard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowedPaths?: string[];
  className?: string;
}

// Default loading component
const DefaultLoading = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex min-h-screen items-center justify-center bg-background",
      className
    )}
  >
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Default unauthorized component
const DefaultUnauthorized = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold text-foreground">401</h1>
      <p className="text-lg text-muted-foreground">Unauthorized Access</p>
      <p className="text-sm text-muted-foreground">
        You need to be logged in to access this page.
      </p>
    </div>
  </div>
);

export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  redirectTo = "/login",
  allowedPaths = ["/login", "/register", "/auth"],
  className,
}: AuthGuardProps) {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Wait for auth to initialize
    if (!isInitialized) {
      return;
    }

    const isPublicPath = allowedPaths.some(
      (path) => pathname.startsWith(path) || pathname === path
    );

    if (requireAuth) {
      // Protected route
      if (!isAuthenticated) {
        if (!isPublicPath) {
          // Store intended destination
          sessionStorage.setItem("redirectAfterAuth", pathname);
          router.replace(redirectTo);
          return;
        }
      } else {
        // User is authenticated
        if (isPublicPath && pathname !== redirectTo) {
          // Check for stored redirect
          const storedRedirect = sessionStorage.getItem("redirectAfterAuth");
          if (storedRedirect) {
            sessionStorage.removeItem("redirectAfterAuth");
            router.replace(storedRedirect);
            return;
          }
          // Default redirect for authenticated users on auth pages
          router.replace("/");
          return;
        }
      }
    } else {
      // Public route - redirect authenticated users away from auth pages
      if (isAuthenticated && isPublicPath) {
        const storedRedirect = sessionStorage.getItem("redirectAfterAuth");
        if (storedRedirect) {
          sessionStorage.removeItem("redirectAfterAuth");
          router.replace(storedRedirect);
          return;
        }
        router.replace("/");
        return;
      }
    }

    setShouldRender(true);
  }, [
    isInitialized,
    isAuthenticated,
    requireAuth,
    pathname,
    router,
    redirectTo,
    allowedPaths,
  ]);

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return fallback || <DefaultLoading className={className} />;
  }

  // Don't render until navigation decisions are made
  if (!shouldRender) {
    return fallback || <DefaultLoading className={className} />;
  }

  // Show unauthorized for protected routes when not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback || <DefaultUnauthorized />;
  }

  // Render children for authorized access
  return <>{children}</>;
}

// Specialized guards for common use cases
export function ProtectedRoute({
  children,
  ...props
}: Omit<AuthGuardProps, "requireAuth">) {
  return (
    <AuthGuard requireAuth={true} {...props}>
      {children}
    </AuthGuard>
  );
}

export function PublicRoute({
  children,
  ...props
}: Omit<AuthGuardProps, "requireAuth">) {
  return (
    <AuthGuard requireAuth={false} {...props}>
      {children}
    </AuthGuard>
  );
}

// HOC version for class components or wrapped exports
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<AuthGuardProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <AuthGuard {...guardProps}>
      <Component {...props} />
    </AuthGuard>
  );

  WrappedComponent.displayName = `withAuthGuard(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
}

// Hook for conditional rendering based on auth status
export function useAuthGuard() {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();
  const pathname = usePathname();

  const canAccess = (requiredAuth: boolean, allowedPaths: string[] = []) => {
    if (!isInitialized) return false;

    const isPublicPath = allowedPaths.some(
      (path) => pathname.startsWith(path) || pathname === path
    );

    if (requiredAuth) {
      return isAuthenticated || isPublicPath;
    }

    return true;
  };

  const shouldRedirect = (
    requiredAuth: boolean,
    allowedPaths: string[] = []
  ) => {
    if (!isInitialized) return false;

    const isPublicPath = allowedPaths.some(
      (path) => pathname.startsWith(path) || pathname === path
    );

    if (requiredAuth && !isAuthenticated && !isPublicPath) {
      return "/login";
    }

    if (!requiredAuth && isAuthenticated && isPublicPath) {
      return "/";
    }

    return null;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    canAccess,
    shouldRedirect,
  };
}

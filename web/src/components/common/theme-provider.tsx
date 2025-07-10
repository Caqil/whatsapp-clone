// src/components/providers/theme-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes";

// Extended theme configuration for WhatsApp-like themes
type Theme = "light" | "dark" | "system";
type WhatsAppTheme = "default" | "business" | "colorful";

interface ExtendedThemeContextType {
  // Basic theme control
  theme: string | undefined;
  setTheme: (theme: string) => void;

  // WhatsApp-specific themes
  whatsappTheme: WhatsAppTheme;
  setWhatsappTheme: (theme: WhatsAppTheme) => void;

  // Accessibility and preferences
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;

  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;

  fontSize: "small" | "medium" | "large";
  setFontSize: (size: "small" | "medium" | "large") => void;

  // Wallpaper and customization
  chatWallpaper: string | null;
  setChatWallpaper: (wallpaper: string | null) => void;

  // Theme utilities
  isDark: boolean;
  isLight: boolean;
  systemTheme: string | undefined;
  resolvedTheme: string | undefined;
}

const ExtendedThemeContext = createContext<
  ExtendedThemeContextType | undefined
>(undefined);

// WhatsApp theme configurations
const whatsappThemes = {
  default: {
    light: {
      primary: "#25d366",
      primaryDark: "#128c7e",
      secondary: "#34b7f1",
      background: "#ffffff",
      surface: "#f0f2f5",
      chatBg: "#e5ddd5",
    },
    dark: {
      primary: "#00a884",
      primaryDark: "#008069",
      secondary: "#53bdeb",
      background: "#0b141a",
      surface: "#202c33",
      chatBg: "#0b141a",
    },
  },
  business: {
    light: {
      primary: "#0088cc",
      primaryDark: "#006699",
      secondary: "#17a2b8",
      background: "#ffffff",
      surface: "#f8f9fa",
      chatBg: "#f0f2f5",
    },
    dark: {
      primary: "#00a0f0",
      primaryDark: "#0080c7",
      secondary: "#20c997",
      background: "#1a1a1a",
      surface: "#2d2d2d",
      chatBg: "#1a1a1a",
    },
  },
  colorful: {
    light: {
      primary: "#ff6b6b",
      primaryDark: "#ee5a52",
      secondary: "#4ecdc4",
      background: "#ffffff",
      surface: "#f8f9ff",
      chatBg: "#f0f8ff",
    },
    dark: {
      primary: "#ff7979",
      primaryDark: "#fd6c6c",
      secondary: "#74b9ff",
      background: "#2d3436",
      surface: "#636e72",
      chatBg: "#2d3436",
    },
  },
};

// Default wallpapers
const defaultWallpapers = [
  "/wallpapers/default-light.jpg",
  "/wallpapers/default-dark.jpg",
  "/wallpapers/geometric-1.jpg",
  "/wallpapers/geometric-2.jpg",
  "/wallpapers/nature-1.jpg",
  "/wallpapers/nature-2.jpg",
  "/wallpapers/abstract-1.jpg",
  "/wallpapers/abstract-2.jpg",
];

export function ExtendedThemeProvider({
  children,
  ...props
}: ThemeProviderProps & { children: React.ReactNode }) {
  // WhatsApp theme state
  const [whatsappTheme, setWhatsappThemeState] =
    useState<WhatsAppTheme>("default");
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [highContrast, setHighContrastState] = useState(false);
  const [fontSize, setFontSizeState] = useState<"small" | "medium" | "large">(
    "medium"
  );
  const [chatWallpaper, setChatWallpaperState] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWhatsAppTheme = localStorage.getItem(
        "whatsapp-theme"
      ) as WhatsAppTheme;
      const savedReducedMotion =
        localStorage.getItem("reduced-motion") === "true";
      const savedHighContrast =
        localStorage.getItem("high-contrast") === "true";
      const savedFontSize = localStorage.getItem("font-size") as
        | "small"
        | "medium"
        | "large";
      const savedWallpaper = localStorage.getItem("chat-wallpaper");

      if (savedWhatsAppTheme) setWhatsappThemeState(savedWhatsAppTheme);
      if (savedReducedMotion) setReducedMotionState(savedReducedMotion);
      if (savedHighContrast) setHighContrastState(savedHighContrast);
      if (savedFontSize) setFontSizeState(savedFontSize);
      if (savedWallpaper) setChatWallpaperState(savedWallpaper);
    }
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      const currentTheme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      const themeColors = whatsappThemes[whatsappTheme][currentTheme];

      // Apply WhatsApp theme colors
      Object.entries(themeColors).forEach(([key, value]) => {
        root.style.setProperty(`--whatsapp-${key}`, value);
      });
    }
  }, [whatsappTheme]);

  // Apply accessibility preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;

      // Reduced motion
      if (reducedMotion) {
        root.classList.add("reduce-motion");
      } else {
        root.classList.remove("reduce-motion");
      }

      // High contrast
      if (highContrast) {
        root.classList.add("high-contrast");
      } else {
        root.classList.remove("high-contrast");
      }

      // Font size
      root.classList.remove("font-small", "font-medium", "font-large");
      root.classList.add(`font-${fontSize}`);

      // Chat wallpaper
      if (chatWallpaper) {
        root.style.setProperty("--chat-wallpaper", `url(${chatWallpaper})`);
      } else {
        root.style.removeProperty("--chat-wallpaper");
      }
    }
  }, [reducedMotion, highContrast, fontSize, chatWallpaper]);

  // Enhanced setter functions that persist to localStorage
  const setWhatsappTheme = (theme: WhatsAppTheme) => {
    setWhatsappThemeState(theme);
    localStorage.setItem("whatsapp-theme", theme);
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem("reduced-motion", enabled.toString());
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem("high-contrast", enabled.toString());
  };

  const setFontSize = (size: "small" | "medium" | "large") => {
    setFontSizeState(size);
    localStorage.setItem("font-size", size);
  };

  const setChatWallpaper = (wallpaper: string | null) => {
    setChatWallpaperState(wallpaper);
    if (wallpaper) {
      localStorage.setItem("chat-wallpaper", wallpaper);
    } else {
      localStorage.removeItem("chat-wallpaper");
    }
  };

  return (
    <NextThemesProvider {...props}>
      <ThemeContextProvider
        whatsappTheme={whatsappTheme}
        setWhatsappTheme={setWhatsappTheme}
        reducedMotion={reducedMotion}
        setReducedMotion={setReducedMotion}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        fontSize={fontSize}
        setFontSize={setFontSize}
        chatWallpaper={chatWallpaper}
        setChatWallpaper={setChatWallpaper}
      >
        {children}
      </ThemeContextProvider>
    </NextThemesProvider>
  );
}

// Inner provider to access NextThemes context
function ThemeContextProvider({
  children,
  whatsappTheme,
  setWhatsappTheme,
  reducedMotion,
  setReducedMotion,
  highContrast,
  setHighContrast,
  fontSize,
  setFontSize,
  chatWallpaper,
  setChatWallpaper,
}: {
  children: React.ReactNode;
  whatsappTheme: WhatsAppTheme;
  setWhatsappTheme: (theme: WhatsAppTheme) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  fontSize: "small" | "medium" | "large";
  setFontSize: (size: "small" | "medium" | "large") => void;
  chatWallpaper: string | null;
  setChatWallpaper: (wallpaper: string | null) => void;
}) {
  // Access NextThemes context (this will be available inside NextThemesProvider)
  const { theme, setTheme, systemTheme, resolvedTheme } =
    require("next-themes").useTheme();

  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";

  const contextValue: ExtendedThemeContextType = {
    // Basic theme control
    theme,
    setTheme,

    // WhatsApp-specific themes
    whatsappTheme,
    setWhatsappTheme,

    // Accessibility
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    fontSize,
    setFontSize,

    // Wallpaper
    chatWallpaper,
    setChatWallpaper,

    // Theme utilities
    isDark,
    isLight,
    systemTheme,
    resolvedTheme,
  };

  return (
    <ExtendedThemeContext.Provider value={contextValue}>
      {children}
    </ExtendedThemeContext.Provider>
  );
}

// Hook to use the extended theme context
export function useTheme(): ExtendedThemeContextType {
  const context = useContext(ExtendedThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

// Theme toggle component
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

// WhatsApp theme selector component
export function WhatsAppThemeSelector() {
  const { whatsappTheme, setWhatsappTheme } = useTheme();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">WhatsApp Theme</label>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(whatsappThemes) as WhatsAppTheme[]).map((themeName) => (
          <button
            key={themeName}
            onClick={() => setWhatsappTheme(themeName)}
            className={`
              p-3 rounded-lg border text-sm capitalize transition-colors
              ${
                whatsappTheme === themeName
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }
            `}
          >
            {themeName}
          </button>
        ))}
      </div>
    </div>
  );
}

// Wallpaper selector component
export function WallpaperSelector() {
  const { chatWallpaper, setChatWallpaper } = useTheme();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Chat Wallpaper</label>
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setChatWallpaper(null)}
          className={`
            aspect-square rounded-lg border-2 flex items-center justify-center text-xs
            ${
              !chatWallpaper
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }
          `}
        >
          None
        </button>
        {defaultWallpapers.map((wallpaper, index) => (
          <button
            key={wallpaper}
            onClick={() => setChatWallpaper(wallpaper)}
            className={`
              aspect-square rounded-lg border-2 overflow-hidden
              ${
                chatWallpaper === wallpaper
                  ? "border-primary"
                  : "border-border hover:border-muted-foreground"
              }
            `}
          >
            <img
              src={wallpaper}
              alt={`Wallpaper ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// Accessibility controls component
export function AccessibilityControls() {
  const {
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    fontSize,
    setFontSize,
  } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Reduced Motion</label>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(e) => setReducedMotion(e.target.checked)}
          className="rounded"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">High Contrast</label>
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(e) => setHighContrast(e.target.checked)}
          className="rounded"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Font Size</label>
        <div className="flex gap-2">
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`
                px-3 py-1 rounded text-sm capitalize transition-colors
                ${
                  fontSize === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }
              `}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExtendedThemeProvider;

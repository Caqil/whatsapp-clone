// src/hooks/use-media-query.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Media query breakpoints matching your design system
 * These should align with your Tailwind CSS configuration
 */
export const BREAKPOINTS = {
  xs: '(min-width: 475px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  
  // Mobile-first responsive breakpoints
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  
  // Orientation queries
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // Device-specific queries
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  
  // Print media
  print: 'print',
  screen: 'screen',
  
  // High DPI displays
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  
  // Dark mode preference (system)
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
  
  // Accessibility preferences
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
} as const;

/**
 * Custom hook for responsive media queries
 * 
 * @param query - Media query string or predefined breakpoint
 * @param serverFallback - Fallback value for SSR (defaults to false)
 * @returns Boolean indicating if the media query matches
 * 
 * @example
 * ```typescript
 * // Using predefined breakpoints
 * const isMobile = useMediaQuery('mobile');
 * const isDesktop = useMediaQuery('desktop');
 * const isDarkMode = useMediaQuery('darkMode');
 * 
 * // Using custom queries
 * const isWide = useMediaQuery('(min-width: 1200px)');
 * const isTouch = useMediaQuery('touch');
 * 
 * // With SSR fallback
 * const isMobile = useMediaQuery('mobile', true);
 * ```
 */
export function useMediaQuery(
  query: keyof typeof BREAKPOINTS | string,
  serverFallback: boolean = false
): boolean {
  // Resolve query string
  const mediaQuery = query in BREAKPOINTS ? BREAKPOINTS[query as keyof typeof BREAKPOINTS] : query;
  
  // State for the current match status
  const [matches, setMatches] = useState<boolean>(() => {
    // SSR-safe initialization
    if (typeof window === 'undefined') {
      return serverFallback;
    }
    
    // Client-side initialization
    try {
      return window.matchMedia(mediaQuery).matches;
    } catch (error) {
      console.warn(`Invalid media query: ${mediaQuery}`, error);
      return serverFallback;
    }
  });

  // Handle media query changes
  const handleChange = useCallback((event: MediaQueryListEvent) => {
    setMatches(event.matches);
  }, []);

  useEffect(() => {
    // Skip on server
    if (typeof window === 'undefined') {
      return;
    }

    let mediaQueryList: MediaQueryList;
    
    try {
      mediaQueryList = window.matchMedia(mediaQuery);
      
      // Set initial value
      setMatches(mediaQueryList.matches);
      
      // Add listener for changes
      mediaQueryList.addEventListener('change', handleChange);
      
      return () => {
        mediaQueryList.removeEventListener('change', handleChange);
      };
    } catch (error) {
      console.warn(`Failed to create media query listener for: ${mediaQuery}`, error);
      return;
    }
  }, [mediaQuery, handleChange]);

  return matches;
}

/**
 * Hook for detecting screen size categories
 * Returns an object with boolean flags for different screen sizes
 */
export function useScreenSize() {
  const isXs = useMediaQuery('xs');
  const isSm = useMediaQuery('sm');
  const isMd = useMediaQuery('md');
  const isLg = useMediaQuery('lg');
  const isXl = useMediaQuery('xl');
  const is2Xl = useMediaQuery('2xl');
  
  const isMobile = useMediaQuery('mobile');
  const isTablet = useMediaQuery('tablet');
  const isDesktop = useMediaQuery('desktop');

  return {
    // Breakpoint flags
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    
    // Device category flags
    isMobile,
    isTablet,
    isDesktop,
    
    // Current breakpoint (largest that matches)
    currentBreakpoint: is2Xl ? '2xl' : 
                      isXl ? 'xl' : 
                      isLg ? 'lg' : 
                      isMd ? 'md' : 
                      isSm ? 'sm' : 
                      isXs ? 'xs' : 'base',
    
    // Device category
    deviceCategory: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
}

/**
 * Hook for detecting device capabilities and preferences
 */
export function useDeviceCapabilities() {
  const isTouch = useMediaQuery('touch');
  const hasMouse = useMediaQuery('mouse');
  const isPortrait = useMediaQuery('portrait');
  const isLandscape = useMediaQuery('landscape');
  const isRetina = useMediaQuery('retina');
  const prefersReducedMotion = useMediaQuery('reducedMotion');
  const prefersHighContrast = useMediaQuery('highContrast');
  const prefersDarkMode = useMediaQuery('darkMode');
  const prefersLightMode = useMediaQuery('lightMode');

  return {
    // Input capabilities
    isTouch,
    hasMouse,
    
    // Orientation
    isPortrait,
    isLandscape,
    orientation: isPortrait ? 'portrait' : 'landscape',
    
    // Display properties
    isRetina,
    
    // User preferences
    prefersReducedMotion,
    prefersHighContrast,
    prefersDarkMode,
    prefersLightMode,
    
    // Theme preference
    themePreference: prefersDarkMode ? 'dark' : prefersLightMode ? 'light' : 'no-preference'
  };
}

/**
 * Hook that combines screen size and device capabilities
 * Useful for comprehensive responsive design decisions
 */
export function useResponsive() {
  const screenSize = useScreenSize();
  const deviceCapabilities = useDeviceCapabilities();
  
  return {
    ...screenSize,
    ...deviceCapabilities,
    
    // Convenience computed properties
    isMobileDevice: screenSize.isMobile || deviceCapabilities.isTouch,
    isDesktopDevice: screenSize.isDesktop && deviceCapabilities.hasMouse,
    shouldShowMobileUI: screenSize.isMobile || (deviceCapabilities.isTouch && screenSize.isTablet),
    shouldReduceAnimations: deviceCapabilities.prefersReducedMotion,
    shouldUseHighContrast: deviceCapabilities.prefersHighContrast,
  };
}

/**
 * Hook for window dimensions
 * Useful when you need exact pixel values rather than media queries
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Set initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
}

/**
 * Export predefined breakpoint hooks for convenience
 */
export const useIsMobile = () => useMediaQuery('mobile');
export const useIsTablet = () => useMediaQuery('tablet');
export const useIsDesktop = () => useMediaQuery('desktop');
export const useIsDarkMode = () => useMediaQuery('darkMode');
export const useIsTouch = () => useMediaQuery('touch');
export const usePrefersReducedMotion = () => useMediaQuery('reducedMotion');
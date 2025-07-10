// src/hooks/use-local-storage.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type UseLocalStorageOptions<T> = {
  defaultValue?: T;
  serializer?: {
    read: (value: string) => T;
    write: (value: T) => string;
  };
  syncAcrossTabs?: boolean;
  onError?: (error: Error) => void;
};

type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((prevValue: T) => T)) => void,
  () => void
];

/**
 * Enhanced localStorage hook with TypeScript support, SSR safety, and cross-tab sync
 */
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    defaultValue,
    serializer = {
      read: JSON.parse,
      write: JSON.stringify,
    },
    syncAcrossTabs = true,
    onError,
  } = options;

  // Track if we're on the client side
  const [isClient, setIsClient] = useState(false);
  
  // Ref to track if component is mounted
  const mountedRef = useRef(false);
  
  // Internal state
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Return default value during SSR
    if (typeof window === 'undefined') {
      return defaultValue as T;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue as T;
      }
      return serializer.read(item);
    } catch (error) {
      onError?.(error as Error);
      return defaultValue as T;
    }
  });

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Read from localStorage on client-side hydration
  useEffect(() => {
    if (!isClient) return;

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const parsedValue = serializer.read(item);
        if (mountedRef.current) {
          setStoredValue(parsedValue);
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [isClient, key, serializer, onError]);

  // Function to update localStorage and state
  const setValue = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      if (!isClient) return;

      try {
        // Allow value to be a function for functional updates
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Update state
        if (mountedRef.current) {
          setStoredValue(valueToStore);
        }

        // Update localStorage
        if (valueToStore === undefined || valueToStore === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, serializer.write(valueToStore));
        }

        // Dispatch custom event for cross-tab sync
        if (syncAcrossTabs) {
          window.dispatchEvent(
            new CustomEvent('local-storage-change', {
              detail: { key, value: valueToStore },
            })
          );
        }
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [isClient, key, storedValue, serializer, syncAcrossTabs, onError]
  );

  // Function to remove value from localStorage
  const removeValue = useCallback(() => {
    if (!isClient) return;

    try {
      window.localStorage.removeItem(key);
      if (mountedRef.current) {
        setStoredValue(defaultValue as T);
      }

      // Dispatch custom event for cross-tab sync
      if (syncAcrossTabs) {
        window.dispatchEvent(
          new CustomEvent('local-storage-change', {
            detail: { key, value: undefined },
          })
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [isClient, key, defaultValue, syncAcrossTabs, onError]);

  // Listen for storage changes (including custom events for cross-tab sync)
  useEffect(() => {
    if (!isClient || !syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if (!mountedRef.current) return;

      let storageKey: string;
      let newValue: string | null;

      if (e instanceof StorageEvent) {
        // Native storage event (from other tabs)
        storageKey = e.key || '';
        newValue = e.newValue;
      } else {
        // Custom event (from same tab)
        storageKey = e.detail.key;
        newValue = e.detail.value !== undefined ? serializer.write(e.detail.value) : null;
      }

      if (storageKey === key) {
        try {
          if (newValue === null) {
            setStoredValue(defaultValue as T);
          } else {
            setStoredValue(serializer.read(newValue));
          }
        } catch (error) {
          onError?.(error as Error);
        }
      }
    };

    // Listen to native storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen to custom events (same tab)
    window.addEventListener('local-storage-change', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleStorageChange as EventListener);
    };
  }, [isClient, key, defaultValue, serializer, syncAcrossTabs, onError]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for storing simple strings in localStorage
 */
export function useLocalStorageString(
  key: string,
  defaultValue: string = ''
): UseLocalStorageReturn<string> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: {
      read: (value: string) => value,
      write: (value: string) => value,
    },
  });
}

/**
 * Hook for storing numbers in localStorage
 */
export function useLocalStorageNumber(
  key: string,
  defaultValue: number = 0
): UseLocalStorageReturn<number> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: {
      read: (value: string) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      },
      write: (value: number) => value.toString(),
    },
  });
}

/**
 * Hook for storing booleans in localStorage
 */
export function useLocalStorageBoolean(
  key: string,
  defaultValue: boolean = false
): UseLocalStorageReturn<boolean> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: {
      read: (value: string) => value === 'true',
      write: (value: boolean) => value.toString(),
    },
  });
}

/**
 * Hook for storing arrays in localStorage
 */
export function useLocalStorageArray<T>(
  key: string,
  defaultValue: T[] = []
): UseLocalStorageReturn<T[]> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: {
      read: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : defaultValue;
        } catch {
          return defaultValue;
        }
      },
      write: (value: T[]) => JSON.stringify(value),
    },
  });
}

/**
 * Hook for storing objects in localStorage with type safety
 */
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  defaultValue: T
): UseLocalStorageReturn<T> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: {
      read: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          return typeof parsed === 'object' && parsed !== null ? { ...defaultValue, ...parsed } : defaultValue;
        } catch {
          return defaultValue;
        }
      },
      write: (value: T) => JSON.stringify(value),
    },
  });
}

/**
 * Hook for storing Set in localStorage
 */
export function useLocalStorageSet<T>(
  key: string,
  defaultValue: Set<T> = new Set()
): [Set<T>, (value: Set<T> | ((prevValue: Set<T>) => Set<T>)) => void, () => void] {
  const [storedValue, setValue, removeValue] = useLocalStorage(key, {
    defaultValue: Array.from(defaultValue),
    serializer: {
      read: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : Array.from(defaultValue);
        } catch {
          return Array.from(defaultValue);
        }
      },
      write: (value: T[]) => JSON.stringify(value),
    },
  });

  const setStoredSet = useCallback(
    (value: Set<T> | ((prevValue: Set<T>) => Set<T>)) => {
      const newSet = value instanceof Function ? value(new Set(storedValue)) : value;
      setValue(Array.from(newSet));
    },
    [storedValue, setValue]
  );

  const removeStoredSet = useCallback(() => {
    setValue(Array.from(defaultValue));
  }, [setValue, defaultValue]);

  return [new Set(storedValue), setStoredSet, removeStoredSet];
}

/**
 * Hook for storing Map in localStorage
 */
export function useLocalStorageMap<K extends string | number, V>(
  key: string,
  defaultValue: Map<K, V> = new Map()
): [Map<K, V>, (value: Map<K, V> | ((prevValue: Map<K, V>) => Map<K, V>)) => void, () => void] {
  const [storedValue, setValue, removeValue] = useLocalStorage(key, {
    defaultValue: Object.fromEntries(defaultValue),
    serializer: {
      read: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          return typeof parsed === 'object' && parsed !== null ? parsed : Object.fromEntries(defaultValue);
        } catch {
          return Object.fromEntries(defaultValue);
        }
      },
      write: (value: Record<string, V>) => JSON.stringify(value),
    },
  });

  const setStoredMap = useCallback(
    (value: Map<K, V> | ((prevValue: Map<K, V>) => Map<K, V>)) => {
      const currentMap = new Map(Object.entries(storedValue) as [K, V][]);
      const newMap = value instanceof Function ? value(currentMap) : value;
      setValue(Object.fromEntries(newMap));
    },
    [storedValue, setValue]
  );

  const removeStoredMap = useCallback(() => {
    setValue(Object.fromEntries(defaultValue));
  }, [setValue, defaultValue]);

  return [new Map(Object.entries(storedValue) as [K, V][]), setStoredMap, removeStoredMap];
}

/**
 * Hook for storing Date in localStorage
 */
export function useLocalStorageDate(
  key: string,
  defaultValue?: Date
): UseLocalStorageReturn<Date | null> {
  return useLocalStorage(key, {
    defaultValue: defaultValue || null,
    serializer: {
      read: (value: string) => {
        try {
          const timestamp = parseInt(value, 10);
          return isNaN(timestamp) ? defaultValue || null : new Date(timestamp);
        } catch {
          return defaultValue || null;
        }
      },
      write: (value: Date | null) => value ? value.getTime().toString() : '',
    },
  });
}

/**
 * Hook that returns a function to check if localStorage is available
 */
export function useIsLocalStorageAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    try {
      const test = '__localStorage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
    }
  }, []);

  return isAvailable;
}

/**
 * Hook to get localStorage usage statistics
 */
export function useLocalStorageStats() {
  const [stats, setStats] = useState({
    used: 0,
    available: 0,
    percentage: 0,
    itemCount: 0,
  });

  const updateStats = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      let totalSize = 0;
      let itemCount = 0;

      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
          itemCount++;
        }
      }

      // Most browsers limit localStorage to ~5-10MB
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const percentage = (totalSize / estimatedLimit) * 100;

      setStats({
        used: totalSize,
        available: estimatedLimit - totalSize,
        percentage: Math.min(percentage, 100),
        itemCount,
      });
    } catch (error) {
      console.error('Error calculating localStorage stats:', error);
    }
  }, []);

  useEffect(() => {
    updateStats();
    
    // Update stats when localStorage changes
    const handleStorageChange = () => updateStats();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleStorageChange);
    };
  }, [updateStats]);

  return { ...stats, refresh: updateStats };
}

/**
 * Hook to clear all localStorage data or specific keys
 */
export function useLocalStorageClear() {
  const clearAll = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.clear();
      window.dispatchEvent(new CustomEvent('local-storage-change', {
        detail: { key: null, value: null },
      }));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);

  const clearByPrefix = useCallback((prefix: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const keysToRemove: string[] = [];
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent('local-storage-change', {
          detail: { key, value: undefined },
        }));
      });
    } catch (error) {
      console.error('Error clearing localStorage by prefix:', error);
    }
  }, []);

  const clearByKeys = useCallback((keys: string[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      keys.forEach(key => {
        localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent('local-storage-change', {
          detail: { key, value: undefined },
        }));
      });
    } catch (error) {
      console.error('Error clearing localStorage keys:', error);
    }
  }, []);

  return { clearAll, clearByPrefix, clearByKeys };
}

/**
 * Hook for storing data with expiration
 */
export function useLocalStorageWithExpiry<T>(key: string, defaultValue: T) {
  const [value, setValue] = useLocalStorage<T>(key, { defaultValue });

  const refresh = useCallback(() => {
    setValue(defaultValue);
  }, [setValue, defaultValue]); 

  useEffect(() => {
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (parsed.expiry && new Date(parsed.expiry) < new Date()) {
        setValue(defaultValue);
      }
    }    
  }, [key, setValue, defaultValue]);        

  return ({
    value,
    setValue,
    refresh,        
  });
}
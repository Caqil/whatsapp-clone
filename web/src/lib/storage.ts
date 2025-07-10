// src/lib/storage.ts
import type { User } from '@/types/user';
import type { Chat } from '@/types/chat';
import type { MessageDraft } from '@/types/message';
import { STORAGE_KEYS } from './constants';

// Storage utility class
class StorageManager {
  private isClient = typeof window !== 'undefined';

  /**
   * Check if localStorage is available
   */
  private isStorageAvailable(): boolean {
    if (!this.isClient) return false;

    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get item from localStorage with error handling
   */
  private getItem(key: string): string | null {
    if (!this.isStorageAvailable()) return null;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item from localStorage: ${key}`, error);
      return null;
    }
  }

  /**
   * Set item in localStorage with error handling
   */
  private setItem(key: string, value: string): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting item in localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage with error handling
   */
  private removeItem(key: string): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item from localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Get JSON data from localStorage
   */
  private getJSON<T>(key: string): T | null {
    const item = this.getItem(key);
    if (!item) return null;

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error parsing JSON from localStorage: ${key}`, error);
      this.removeItem(key); // Remove corrupted data
      return null;
    }
  }

  /**
   * Set JSON data in localStorage
   */
  private setJSON<T>(key: string, value: T): boolean {
    try {
      const jsonString = JSON.stringify(value);
      return this.setItem(key, jsonString);
    } catch (error) {
      console.error(`Error stringifying JSON for localStorage: ${key}`, error);
      return false;
    }
  }

  // ========== Authentication Storage ==========

  /**
   * Get stored authentication tokens
   */
getTokens(): { accessToken: string | null; refreshToken: string | null; expiresAt: string | null } {
  return {
    accessToken: this.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    refreshToken: this.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    expiresAt: this.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT),
  };
}
/**
 * Set authentication tokens - FIXED to include expiresAt
 */
setTokens(accessToken: string, refreshToken: string, expiresAt?: string): boolean {
  const now = new Date().toISOString();
  
  const accessSet = this.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  const refreshSet = this.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  const issuedSet = this.setItem(STORAGE_KEYS.TOKEN_ISSUED_AT, now);
  
  let expiresSet = true;
  if (expiresAt) {
    expiresSet = this.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt);
  }
  
  console.log('💾 Storing tokens:', {
    accessToken: accessToken ? '✅' : '❌',
    refreshToken: refreshToken ? '✅' : '❌',
    expiresAt: expiresAt || 'not provided',
    issuedAt: now,
    success: accessSet && refreshSet && expiresSet && issuedSet
  });
  
  return accessSet && refreshSet && expiresSet && issuedSet;
}
/**
 * Remove authentication tokens
 */
removeTokens(): void {
  console.log('🗑️ Removing stored tokens');
  this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  this.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  this.removeItem(STORAGE_KEYS.TOKEN_ISSUED_AT);
}

  /**
   * Get stored user data
   */
  getUserData(): User | null {
    return this.getJSON<User>(STORAGE_KEYS.USER_DATA);
  }

  /**
   * Set user data
   */
  setUserData(user: User): boolean {
    return this.setJSON(STORAGE_KEYS.USER_DATA, user);
  }

  /**
   * Remove user data
   */
  removeUserData(): void {
    this.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // ========== User Preferences Storage ==========

  /**
   * Get theme preference
   */
  getTheme(): 'light' | 'dark' | 'system' | null {
    return this.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | 'system' | null;
  }

  /**
   * Set theme preference
   */
  setTheme(theme: 'light' | 'dark' | 'system'): boolean {
    return this.setItem(STORAGE_KEYS.THEME, theme);
  }

  /**
   * Get language preference
   */
  getLanguage(): string | null {
    return this.getItem(STORAGE_KEYS.LANGUAGE);
  }

  /**
   * Set language preference
   */
  setLanguage(language: string): boolean {
    return this.setItem(STORAGE_KEYS.LANGUAGE, language);
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(): Record<string, boolean> | null {
    return this.getJSON<Record<string, boolean>>(STORAGE_KEYS.NOTIFICATIONS);
  }

  /**
   * Set notification preferences
   */
  setNotificationPreferences(preferences: Record<string, boolean>): boolean {
    return this.setJSON(STORAGE_KEYS.NOTIFICATIONS, preferences);
  }

  // ========== Chat State Storage ==========

  /**
   * Get current chat ID
   */
  getCurrentChatId(): string | null {
    return this.getItem(STORAGE_KEYS.CURRENT_CHAT);
  }

  /**
   * Set current chat ID
   */
  setCurrentChatId(chatId: string): boolean {
    return this.setItem(STORAGE_KEYS.CURRENT_CHAT, chatId);
  }

  /**
   * Remove current chat ID
   */
  removeCurrentChatId(): void {
    this.removeItem(STORAGE_KEYS.CURRENT_CHAT);
  }

  /**
   * Get chat drafts
   */
  getChatDrafts(): Record<string, MessageDraft> | null {
    return this.getJSON<Record<string, MessageDraft>>(STORAGE_KEYS.CHAT_DRAFTS);
  }

  /**
   * Set chat draft
   */
  setChatDraft(chatId: string, draft: MessageDraft): boolean {
    const drafts = this.getChatDrafts() || {};
    drafts[chatId] = draft;
    return this.setJSON(STORAGE_KEYS.CHAT_DRAFTS, drafts);
  }

  /**
   * Remove chat draft
   */
  removeChatDraft(chatId: string): boolean {
    const drafts = this.getChatDrafts() || {};
    delete drafts[chatId];
    return this.setJSON(STORAGE_KEYS.CHAT_DRAFTS, drafts);
  }

  /**
   * Get pinned chats
   */
  getPinnedChats(): string[] | null {
    return this.getJSON<string[]>(STORAGE_KEYS.PINNED_CHATS);
  }

  /**
   * Set pinned chats
   */
  setPinnedChats(chatIds: string[]): boolean {
    return this.setJSON(STORAGE_KEYS.PINNED_CHATS, chatIds);
  }

  /**
   * Add pinned chat
   */
  addPinnedChat(chatId: string): boolean {
    const pinned = this.getPinnedChats() || [];
    if (!pinned.includes(chatId)) {
      pinned.push(chatId);
      return this.setPinnedChats(pinned);
    }
    return true;
  }

  /**
   * Remove pinned chat
   */
  removePinnedChat(chatId: string): boolean {
    const pinned = this.getPinnedChats() || [];
    const filtered = pinned.filter(id => id !== chatId);
    return this.setPinnedChats(filtered);
  }

  /**
   * Get muted chats
   */
  getMutedChats(): Record<string, number> | null {
    return this.getJSON<Record<string, number>>(STORAGE_KEYS.MUTED_CHATS);
  }

  /**
   * Set muted chats
   */
  setMutedChats(mutedChats: Record<string, number>): boolean {
    return this.setJSON(STORAGE_KEYS.MUTED_CHATS, mutedChats);
  }

  /**
   * Mute chat
   */
  muteChat(chatId: string, until: number = -1): boolean {
    const muted = this.getMutedChats() || {};
    muted[chatId] = until;
    return this.setMutedChats(muted);
  }

  /**
   * Unmute chat
   */
  unmuteChat(chatId: string): boolean {
    const muted = this.getMutedChats() || {};
    delete muted[chatId];
    return this.setMutedChats(muted);
  }

  /**
   * Check if chat is muted
   */
  isChatMuted(chatId: string): boolean {
    const muted = this.getMutedChats() || {};
    const muteUntil = muted[chatId];
    
    if (muteUntil === undefined) return false;
    if (muteUntil === -1) return true; // Muted forever
    
    return Date.now() < muteUntil;
  }

  // ========== UI State Storage ==========

  /**
   * Get sidebar collapsed state
   */
  getSidebarCollapsed(): boolean {
    const item = this.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    return item === 'true';
  }

  /**
   * Set sidebar collapsed state
   */
  setSidebarCollapsed(collapsed: boolean): boolean {
    return this.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed.toString());
  }

  /**
   * Get recent emojis
   */
  getRecentEmojis(): string[] | null {
    return this.getJSON<string[]>(STORAGE_KEYS.EMOJI_RECENT);
  }

  /**
   * Set recent emojis
   */
  setRecentEmojis(emojis: string[]): boolean {
    return this.setJSON(STORAGE_KEYS.EMOJI_RECENT, emojis);
  }

  /**
   * Add recent emoji
   */
  addRecentEmoji(emoji: string, maxCount: number = 20): boolean {
    const recent = this.getRecentEmojis() || [];
    
    // Remove if already exists
    const filtered = recent.filter(e => e !== emoji);
    
    // Add to beginning
    filtered.unshift(emoji);
    
    // Limit to maxCount
    const limited = filtered.slice(0, maxCount);
    
    return this.setRecentEmojis(limited);
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] | null {
    return this.getJSON<string[]>(STORAGE_KEYS.SEARCH_HISTORY);
  }

  /**
   * Set search history
   */
  setSearchHistory(history: string[]): boolean {
    return this.setJSON(STORAGE_KEYS.SEARCH_HISTORY, history);
  }

  /**
   * Add search query to history
   */
  addSearchQuery(query: string, maxCount: number = 10): boolean {
    if (!query.trim()) return true;
    
    const history = this.getSearchHistory() || [];
    
    // Remove if already exists
    const filtered = history.filter(q => q !== query);
    
    // Add to beginning
    filtered.unshift(query);
    
    // Limit to maxCount
    const limited = filtered.slice(0, maxCount);
    
    return this.setSearchHistory(limited);
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  }

  // ========== Cache Management ==========

  /**
   * Get cache size in bytes (approximate)
   */
  getCacheSize(): number {
    if (!this.isStorageAvailable()) return 0;

    let total = 0;
    
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('whatsapp_')) {
          total += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.error('Error calculating cache size:', error);
    }
    
    return total;
  }

  /**
   * Clear all app data from localStorage
   */
  clearAllData(): void {
    if (!this.isStorageAvailable()) return;

    try {
      const keysToRemove: string[] = [];
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('whatsapp_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ All app data cleared from localStorage');
    } catch (error) {
      console.error('Error clearing app data:', error);
    }
  }

  /**
   * Clear expired data
   */
  clearExpiredData(): void {
    // Clear expired muted chats
    const muted = this.getMutedChats() || {};
    const now = Date.now();
    const activeMuted: Record<string, number> = {};
    
    Object.entries(muted).forEach(([chatId, until]) => {
      if (until === -1 || until > now) {
        activeMuted[chatId] = until;
      }
    });
    
    this.setMutedChats(activeMuted);
    
    // TODO: Add more expired data cleanup as needed
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    totalSize: number;
    itemCount: number;
    keyBreakdown: Record<string, number>;
  } {
    const stats = {
      totalSize: 0,
      itemCount: 0,
      keyBreakdown: {} as Record<string, number>,
    };

    if (!this.isStorageAvailable()) return stats;

    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('whatsapp_')) {
          const size = localStorage[key].length + key.length;
          stats.totalSize += size;
          stats.itemCount++;
          stats.keyBreakdown[key] = size;
        }
      }
    } catch (error) {
      console.error('Error calculating storage stats:', error);
    }

    return stats;
  }
}

// Create singleton instance
const storageManager = new StorageManager();

// ========== Exported Functions ==========
export const getStoredTokens = () => storageManager.getTokens();
export const setStoredTokens = (accessToken: string, refreshToken: string, expiresAt?: string) => 
  storageManager.setTokens(accessToken, refreshToken, expiresAt);
export const removeStoredTokens = () => storageManager.removeTokens();

export const getStoredUser = () => storageManager.getUserData();
export const setStoredUser = (user: User) => storageManager.setUserData(user);
export const removeStoredUser = () => storageManager.removeUserData();

// Preferences
export const getStoredTheme = () => storageManager.getTheme();
export const setStoredTheme = (theme: 'light' | 'dark' | 'system') => storageManager.setTheme(theme);

export const getStoredLanguage = () => storageManager.getLanguage();
export const setStoredLanguage = (language: string) => storageManager.setLanguage(language);

export const getStoredNotificationPreferences = () => storageManager.getNotificationPreferences();
export const setStoredNotificationPreferences = (preferences: Record<string, boolean>) => 
  storageManager.setNotificationPreferences(preferences);

// Chat state
export const getCurrentChatId = () => storageManager.getCurrentChatId();
export const setCurrentChatId = (chatId: string) => storageManager.setCurrentChatId(chatId);
export const removeCurrentChatId = () => storageManager.removeCurrentChatId();

export const getChatDrafts = () => storageManager.getChatDrafts();
export const setChatDraft = (chatId: string, draft: MessageDraft) => storageManager.setChatDraft(chatId, draft);
export const removeChatDraft = (chatId: string) => storageManager.removeChatDraft(chatId);

export const getPinnedChats = () => storageManager.getPinnedChats();
export const addPinnedChat = (chatId: string) => storageManager.addPinnedChat(chatId);
export const removePinnedChat = (chatId: string) => storageManager.removePinnedChat(chatId);

export const getMutedChats = () => storageManager.getMutedChats();
export const muteChat = (chatId: string, until?: number) => storageManager.muteChat(chatId, until);
export const unmuteChat = (chatId: string) => storageManager.unmuteChat(chatId);
export const isChatMuted = (chatId: string) => storageManager.isChatMuted(chatId);

// UI state
export const getSidebarCollapsed = () => storageManager.getSidebarCollapsed();
export const setSidebarCollapsed = (collapsed: boolean) => storageManager.setSidebarCollapsed(collapsed);

export const getRecentEmojis = () => storageManager.getRecentEmojis();
export const setRecentEmojis = (emojis: string[]) => storageManager.setRecentEmojis(emojis);
export const addRecentEmoji = (emoji: string, maxCount?: number) => storageManager.addRecentEmoji(emoji, maxCount);

export const getSearchHistory = () => storageManager.getSearchHistory();
export const setSearchHistory = (history: string[]) => storageManager.setSearchHistory(history);
export const addSearchQuery = (query: string, maxCount?: number) => storageManager.addSearchQuery(query, maxCount);

// Utilities
export const clearAllStoredData = () => storageManager.clearAllData();
export const getStorageStats = () => storageManager.getStorageStats();

// Default export
export default storageManager;
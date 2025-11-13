/* eslint-disable no-console */
import { AdminConfig } from './admin.types';
import { BRAND_SLUG, LEGACY_BRAND_SLUGS } from './brand';
import {
  EpisodeSkipConfig,
  Favorite,
  IStorage,
  PlayRecord,
  UserSettings,
} from './types';

const ADMIN_CONFIG_KEY = `${BRAND_SLUG}_admin_config`;
const LEGACY_ADMIN_CONFIG_KEYS = LEGACY_BRAND_SLUGS.map(
  (slug) => `${slug}_admin_config`
);

/**
 * LocalStorage 存储实现
 * 主要用于本地开发和简单部署场景
 */
export class LocalStorage implements IStorage {
  private static initialized = false;

  constructor() {
    if (!LocalStorage.initialized && typeof window !== 'undefined') {
      this.migrateLegacyKeys();
      LocalStorage.initialized = true;
    }
  }

  private migrateLegacyKeys(): void {
    const legacyPrefixes = LEGACY_BRAND_SLUGS.map((slug) => `${slug}_`);
    const regex = new RegExp(`^(${LEGACY_BRAND_SLUGS.join('|')})_`);
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (
        storageKey &&
        legacyPrefixes.some((prefix) => storageKey.startsWith(prefix))
      ) {
        keys.push(storageKey);
      }
    }

    keys.forEach((legacyKey) => {
      const value = localStorage.getItem(legacyKey);
      if (!value) {
        return;
      }
      const migratedKey = legacyKey.replace(regex, `${BRAND_SLUG}_`);
      localStorage.setItem(migratedKey, value);
      localStorage.removeItem(legacyKey);
    });
  }

  private formatKey(
    brand: string,
    prefix: string,
    userName: string,
    key?: string
  ): string {
    return key
      ? `${brand}_${prefix}_${userName}_${key}`
      : `${brand}_${prefix}_${userName}`;
  }

  private getStorageKey(
    prefix: string,
    userName: string,
    key?: string
  ): string {
    return this.formatKey(BRAND_SLUG, prefix, userName, key);
  }

  private getLegacyStorageKeys(
    prefix: string,
    userName: string,
    key?: string
  ): string[] {
    return LEGACY_BRAND_SLUGS.map((legacy) =>
      this.formatKey(legacy, prefix, userName, key)
    );
  }

  private removeLegacyStorageKeys(
    prefix: string,
    userName: string,
    key?: string
  ): void {
    this.getLegacyStorageKeys(prefix, userName, key).forEach((storageKey) => {
      localStorage.removeItem(storageKey);
    });
  }

  private getStorageValue(
    prefix: string,
    userName: string,
    key?: string
  ): string | null {
    const storageKey = this.getStorageKey(prefix, userName, key);
    const primary = localStorage.getItem(storageKey);
    if (primary) {
      return primary;
    }
    for (const legacyKey of this.getLegacyStorageKeys(prefix, userName, key)) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        return legacy;
      }
    }
    return null;
  }

  // ---------- 播放记录 ----------
  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    if (typeof window === 'undefined') return null;

    try {
      const data = this.getStorageValue('playrecord', userName, key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting play record:', error);
      return null;
    }
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('playrecord', userName, key);
      localStorage.setItem(storageKey, JSON.stringify(record));
      this.removeLegacyStorageKeys('playrecord', userName, key);
    } catch (error) {
      console.error('Error setting play record:', error);
    }
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<{ [key: string]: PlayRecord }> {
    if (typeof window === 'undefined') return {};

    try {
      const prefixes = [
        ...this.getLegacyStorageKeys('playrecord', userName),
        this.getStorageKey('playrecord', userName),
      ];
      const records: { [key: string]: PlayRecord } = {};

      for (const prefix of prefixes) {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(prefix + '_')) {
            const key = storageKey.replace(prefix + '_', '');
            const data = localStorage.getItem(storageKey);
            if (data) {
              records[key] = JSON.parse(data);
            }
          }
        }
      }

      return records;
    } catch (error) {
      console.error('Error getting all play records:', error);
      return {};
    }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('playrecord', userName, key);
      localStorage.removeItem(storageKey);
      this.removeLegacyStorageKeys('playrecord', userName, key);
    } catch (error) {
      console.error('Error deleting play record:', error);
    }
  }

  // ---------- 收藏 ----------
  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    if (typeof window === 'undefined') return null;

    try {
      const data = this.getStorageValue('favorite', userName, key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting favorite:', error);
      return null;
    }
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('favorite', userName, key);
      localStorage.setItem(storageKey, JSON.stringify(favorite));
      this.removeLegacyStorageKeys('favorite', userName, key);
    } catch (error) {
      console.error('Error setting favorite:', error);
    }
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    if (typeof window === 'undefined') return {};

    try {
      const prefixes = [
        ...this.getLegacyStorageKeys('favorite', userName),
        this.getStorageKey('favorite', userName),
      ];
      const favorites: { [key: string]: Favorite } = {};

      for (const prefix of prefixes) {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(prefix + '_')) {
            const key = storageKey.replace(prefix + '_', '');
            const data = localStorage.getItem(storageKey);
            if (data) {
              favorites[key] = JSON.parse(data);
            }
          }
        }
      }

      return favorites;
    } catch (error) {
      console.error('Error getting all favorites:', error);
      return {};
    }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('favorite', userName, key);
      localStorage.removeItem(storageKey);
      this.removeLegacyStorageKeys('favorite', userName, key);
    } catch (error) {
      console.error('Error deleting favorite:', error);
    }
  }

  // ---------- 用户管理 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('user', userName);
      const userData = { password, createdAt: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify(userData));
      this.removeLegacyStorageKeys('user', userName);
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const data = this.getStorageValue('user', userName);
      if (!data) return false;

      const userData = JSON.parse(data);
      return userData.password === password;
    } catch (error) {
      console.error('Error verifying user:', error);
      return false;
    }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const data = this.getStorageValue('user', userName);
      return data !== null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    if (typeof window === 'undefined') return [];

    try {
      const data = this.getStorageValue('searchhistory', userName);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const history = await this.getSearchHistory(userName);
      // 移除重复项并添加到开头
      const newHistory = [
        keyword,
        ...history.filter((item) => item !== keyword),
      ];
      // 限制历史记录数量
      const limitedHistory = newHistory.slice(0, 50);

      const storageKey = this.getStorageKey('searchhistory', userName);
      localStorage.setItem(storageKey, JSON.stringify(limitedHistory));
      this.removeLegacyStorageKeys('searchhistory', userName);
    } catch (error) {
      console.error('Error adding search history:', error);
    }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('searchhistory', userName);

      if (!keyword) {
        // 删除所有搜索历史
        localStorage.removeItem(storageKey);
        this.removeLegacyStorageKeys('searchhistory', userName);
      } else {
        // 删除特定搜索历史
        const history = await this.getSearchHistory(userName);
        const newHistory = history.filter((item) => item !== keyword);
        localStorage.setItem(storageKey, JSON.stringify(newHistory));
        this.removeLegacyStorageKeys('searchhistory', userName);
      }
    } catch (error) {
      console.error('Error deleting search history:', error);
    }
  }

  // ---------- 跳过配置 ----------
  async getSkipConfig(
    userName: string,
    key: string
  ): Promise<EpisodeSkipConfig | null> {
    if (typeof window === 'undefined') return null;

    try {
      const data = this.getStorageValue('skipconfig', userName, key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting skip config:', error);
      return null;
    }
  }

  async setSkipConfig(
    userName: string,
    key: string,
    config: EpisodeSkipConfig
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('skipconfig', userName, key);
      localStorage.setItem(storageKey, JSON.stringify(config));
      this.removeLegacyStorageKeys('skipconfig', userName, key);
    } catch (error) {
      console.error('Error setting skip config:', error);
    }
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    if (typeof window === 'undefined') return {};

    try {
      const prefixes = [
        ...this.getLegacyStorageKeys('skipconfig', userName),
        this.getStorageKey('skipconfig', userName),
      ];
      const configs: { [key: string]: EpisodeSkipConfig } = {};

      for (const prefix of prefixes) {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(prefix + '_')) {
            const key = storageKey.replace(prefix + '_', '');
            const data = localStorage.getItem(storageKey);
            if (data) {
              configs[key] = JSON.parse(data);
            }
          }
        }
      }

      return configs;
    } catch (error) {
      console.error('Error getting all skip configs:', error);
      return {};
    }
  }

  async deleteSkipConfig(userName: string, key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('skipconfig', userName, key);
      localStorage.removeItem(storageKey);
      this.removeLegacyStorageKeys('skipconfig', userName, key);
    } catch (error) {
      console.error('Error deleting skip config:', error);
    }
  }

  // ---------- 用户设置 ----------
  async getUserSettings(userName: string): Promise<UserSettings | null> {
    if (typeof window === 'undefined') return null;

    try {
      const data = this.getStorageValue('settings', userName);
      if (data) {
        return JSON.parse(data);
      }

      // 如果用户设置不存在，返回默认设置
      const defaultSettings: UserSettings = {
        filter_adult_content: true, // 默认开启成人内容过滤
        theme: 'auto',
        language: 'zh-CN',
        auto_play: true,
        video_quality: 'auto',
      };

      return defaultSettings;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  async setUserSettings(
    userName: string,
    settings: UserSettings
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey('settings', userName);
      localStorage.setItem(storageKey, JSON.stringify(settings));
      this.removeLegacyStorageKeys('settings', userName);
    } catch (error) {
      console.error('Error setting user settings:', error);
    }
  }

  async updateUserSettings(
    userName: string,
    settings: Partial<UserSettings>
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const currentSettings = await this.getUserSettings(userName);
      const updatedSettings = { ...currentSettings, ...settings };
      await this.setUserSettings(userName, updatedSettings as UserSettings);
    } catch (error) {
      console.error('Error updating user settings:', error);
    }
  }

  // ---------- 管理员功能 ----------
  async getAllUsers(): Promise<string[]> {
    if (typeof window === 'undefined') return [];

    try {
      const users: string[] = [];
      const prefixes = [
        this.formatKey(BRAND_SLUG, 'user', ''),
        ...LEGACY_BRAND_SLUGS.map((legacy) =>
          this.formatKey(legacy, 'user', '')
        ),
      ];

      const seen = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey) continue;
        for (const prefix of prefixes) {
          if (storageKey.startsWith(prefix)) {
            const userName = storageKey.replace(prefix, '');
            if (!seen.has(userName)) {
              seen.add(userName);
              users.push(userName);
            }
          }
        }
      }

      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    if (typeof window === 'undefined') return null;

    try {
      const primary = localStorage.getItem(ADMIN_CONFIG_KEY);
      if (primary) {
        return JSON.parse(primary);
      }
      for (const legacyKey of LEGACY_ADMIN_CONFIG_KEYS) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          return JSON.parse(legacy);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting admin config:', error);
      return null;
    }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
      LEGACY_ADMIN_CONFIG_KEYS.forEach((legacyKey) =>
        localStorage.removeItem(legacyKey)
      );
    } catch (error) {
      console.error('Error setting admin config:', error);
    }
  }

  // ---------- 用户管理（管理员功能）----------
  async changePassword(userName: string, newPassword: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const data = this.getStorageValue('user', userName);
      if (!data) {
        throw new Error('用户不存在');
      }

      const storageKey = this.getStorageKey('user', userName);
      const userData = JSON.parse(data);
      userData.password = newPassword;
      userData.updatedAt = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(userData));
      this.removeLegacyStorageKeys('user', userName);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  async deleteUser(userName: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 删除用户账号
      const userKey = this.getStorageKey('user', userName);
      localStorage.removeItem(userKey);
      this.removeLegacyStorageKeys('user', userName);

      // 删除用户相关的所有数据
      const prefixes = [
        'playrecord',
        'favorite',
        'searchhistory',
        'skipconfig',
        'settings',
      ];

      for (const prefix of prefixes) {
        const dataPrefixes = [
          ...this.getLegacyStorageKeys(prefix, userName),
          this.getStorageKey(prefix, userName),
        ];
        const keysToRemove = new Set<string>();

        for (const dataPrefix of dataPrefixes) {
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (
              storageKey &&
              (storageKey === dataPrefix ||
                storageKey.startsWith(dataPrefix + '_'))
            ) {
              keysToRemove.add(storageKey);
            }
          }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

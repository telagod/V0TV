/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { D1Storage } from './d1.db';
import { KvrocksStorage } from './kvrocks.db';
import { LocalStorage } from './localstorage.db';
import { RedisStorage } from './redis.db';
import { Favorite, IStorage, PlayRecord } from './types';
import { UpstashRedisStorage } from './upstash.db';

// storage type 常量: 'localstorage' | 'redis' | 'kvrocks' | 'd1' | 'upstash'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'kvrocks'
    | 'd1'
    | 'upstash'
    | undefined) || 'localstorage';

// 创建存储实例
function createStorage(dbInstance?: any): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'kvrocks':
      return new KvrocksStorage();
    case 'upstash':
      return new UpstashRedisStorage();
    case 'd1':
      return new D1Storage(dbInstance);
    case 'localstorage':
    default:
      // 使用 LocalStorage 实现，适用于本地开发和简单部署
      return new LocalStorage();
  }
}

// 单例存储实例（仅用于非 D1 存储类型）
let storageInstance: IStorage | null = null;

/**
 * 获取存储实例
 * @param dbInstance 可选的 D1 数据库实例（仅在使用 D1 存储时需要）
 *                   在 API 路由中，应该从 getCloudflareContext().env.DB 获取并传入
 * @returns IStorage 实例
 */
export function getStorage(dbInstance?: any): IStorage {
  // D1 存储需要为每个请求创建新实例（传入特定的 DB 绑定）
  if (STORAGE_TYPE === 'd1' && dbInstance) {
    return createStorage(dbInstance);
  }

  // 其他存储类型使用单例模式
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 导出便捷方法
export class DbManager {
  private storage: IStorage;
  private dbInstance?: any;

  /**
   * 构造函数
   * @param dbInstance 可选的 D1 数据库实例
   *                   在 API 路由中，应该从 getCloudflareContext().env.DB 获取并传入
   */
  constructor(dbInstance?: any) {
    this.dbInstance = dbInstance;
    this.storage = getStorage(dbInstance);
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<PlayRecord | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<Favorite | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    return this.storage.checkUserExist(userName);
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    if (typeof (this.storage as any).getAllUsers === 'function') {
      return (this.storage as any).getAllUsers();
    }
    return [];
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (typeof (this.storage as any).getAdminConfig === 'function') {
      return (this.storage as any).getAdminConfig();
    }
    return null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    if (typeof (this.storage as any).setAdminConfig === 'function') {
      await (this.storage as any).setAdminConfig(config);
    }
  }

  // ---------- 跳过配置 ----------
  async getSkipConfig(userName: string, key: string): Promise<any> {
    if (typeof (this.storage as any).getSkipConfig === 'function') {
      return (this.storage as any).getSkipConfig(userName, key);
    }
    return null;
  }

  async saveSkipConfig(
    userName: string,
    key: string,
    config: any
  ): Promise<void> {
    if (typeof (this.storage as any).setSkipConfig === 'function') {
      await (this.storage as any).setSkipConfig(userName, key, config);
    }
  }

  async getAllSkipConfigs(userName: string): Promise<{ [key: string]: any }> {
    if (typeof (this.storage as any).getAllSkipConfigs === 'function') {
      return (this.storage as any).getAllSkipConfigs(userName);
    }
    return {};
  }

  async deleteSkipConfig(userName: string, key: string): Promise<void> {
    if (typeof (this.storage as any).deleteSkipConfig === 'function') {
      await (this.storage as any).deleteSkipConfig(userName, key);
    }
  }
}

// 导出默认实例
export const db = new DbManager();

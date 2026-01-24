import { AdminConfig } from './admin.types';
import {
  EpisodeSkipConfig,
  Favorite,
  IStorage,
  PlayRecord,
  UserSettings,
} from './types';

type CloudflareContext = { env?: { DB?: D1Database } };
type GetCloudflareContextFn = () => CloudflareContext;

let getCloudflareContext: GetCloudflareContextFn | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cf = require('@opennextjs/cloudflare') as {
    getCloudflareContext?: GetCloudflareContextFn;
  };
  getCloudflareContext = cf.getCloudflareContext ?? null;
} catch {
  // @opennextjs/cloudflare 不可用
}

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

// D1数据库行类型
interface D1PlayRecordRow {
  key: string;
  username: string;
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index_episode: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  search_title?: string;
}

interface D1FavoriteRow {
  username: string;
  key: string;
  title: string;
  source_name: string;
  cover: string;
  year: string;
  total_episodes: number;
  save_time: number;
  search_title?: string;
}

interface D1UserSettingsRow {
  settings: string;
}

interface D1SkipConfigRow {
  key: string;
  source: string;
  video_id: string;
  title: string;
  segments: string;
  updated_time: number;
}

// D1 数据库接口
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<D1ExecResult>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    changed_db: boolean;
    changes: number;
    last_row_id: number;
    duration: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

function getD1Database(dbInstance?: D1Database): D1Database {
  if (dbInstance) {
    return dbInstance;
  }

  if (getCloudflareContext) {
    try {
      const ctx = getCloudflareContext();
      if (ctx?.env?.DB) {
        return ctx.env.DB;
      }
    } catch {
      // getCloudflareContext 调用失败
    }
  }

  const envWithDb = process.env as NodeJS.ProcessEnv & { DB?: D1Database };
  if (envWithDb.DB) {
    return envWithDb.DB;
  }

  throw new Error(
    '[D1] 无法获取 D1 数据库绑定。' +
      '在生产环境中，请通过 getCloudflareContext().env.DB 获取 DB 并传递给 D1Storage 构造函数。' +
      '在开发环境中，请使用 wrangler dev 启动。',
  );
}

export class D1Storage implements IStorage {
  private db: D1Database | null = null;
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * 构造函数
   * @param dbInstance 可选的 D1 数据库实例
   *                   在 API 路由中，应该从 getCloudflareContext().env.DB 获取并传入
   */
  constructor(dbInstance?: D1Database) {
    if (dbInstance) {
      this.db = dbInstance;
    }
  }

  private async getDatabase(): Promise<D1Database> {
    if (!this.db) {
      this.db = getD1Database();
      // 自动初始化数据库（仅执行一次）
      await this.initializeDatabase();
    }
    return this.db;
  }

  /**
   * 自动初始化数据库表结构
   * 使用 CREATE TABLE IF NOT EXISTS 确保幂等性
   */
  private async initializeDatabase(): Promise<void> {
    // 如果已经初始化，直接返回
    if (D1Storage.initialized) {
      return;
    }

    // 如果正在初始化，等待完成
    if (D1Storage.initPromise) {
      return D1Storage.initPromise;
    }

    // 开始初始化
    D1Storage.initPromise = (async () => {
      try {
        console.log('[D1] 开始自动初始化数据库...');

        const initSQL = `
          -- 用户表
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at INTEGER DEFAULT (unixepoch()),
            updated_at INTEGER DEFAULT (unixepoch())
          );

          -- 播放记录表
          CREATE TABLE IF NOT EXISTS play_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            key TEXT NOT NULL,
            title TEXT NOT NULL,
            source_name TEXT NOT NULL,
            cover TEXT,
            year TEXT,
            index_episode INTEGER DEFAULT 0,
            total_episodes INTEGER DEFAULT 0,
            play_time REAL DEFAULT 0,
            total_time REAL DEFAULT 0,
            save_time INTEGER DEFAULT (unixepoch()),
            search_title TEXT,
            created_at INTEGER DEFAULT (unixepoch()),
            UNIQUE(username, key)
          );

          -- 收藏表
          CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            key TEXT NOT NULL,
            title TEXT NOT NULL,
            source_name TEXT NOT NULL,
            cover TEXT,
            year TEXT,
            total_episodes INTEGER DEFAULT 0,
            save_time INTEGER DEFAULT (unixepoch()),
            search_title TEXT,
            created_at INTEGER DEFAULT (unixepoch()),
            UNIQUE(username, key)
          );

          -- 搜索历史表
          CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            keyword TEXT NOT NULL,
            created_at INTEGER DEFAULT (unixepoch())
          );

          -- 跳过配置表
          CREATE TABLE IF NOT EXISTS skip_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            key TEXT NOT NULL,
            source TEXT NOT NULL,
            video_id TEXT NOT NULL,
            title TEXT NOT NULL,
            segments TEXT NOT NULL,
            updated_time INTEGER DEFAULT (unixepoch()),
            created_at INTEGER DEFAULT (unixepoch()),
            UNIQUE(username, key)
          );

          -- 用户设置表
          CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            settings TEXT NOT NULL,
            updated_time INTEGER DEFAULT (unixepoch()),
            created_at INTEGER DEFAULT (unixepoch())
          );

          -- 管理员配置表
          CREATE TABLE IF NOT EXISTS admin_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT,
            description TEXT,
            created_at INTEGER DEFAULT (unixepoch()),
            updated_at INTEGER DEFAULT (unixepoch())
          );

          -- 创建索引以提高查询性能
          CREATE INDEX IF NOT EXISTS idx_play_records_username ON play_records(username);
          CREATE INDEX IF NOT EXISTS idx_play_records_key ON play_records(key);
          CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
          CREATE INDEX IF NOT EXISTS idx_favorites_key ON favorites(key);
          CREATE INDEX IF NOT EXISTS idx_search_history_username ON search_history(username);
          CREATE INDEX IF NOT EXISTS idx_skip_configs_username ON skip_configs(username);
          CREATE INDEX IF NOT EXISTS idx_skip_configs_key ON skip_configs(key);
          CREATE INDEX IF NOT EXISTS idx_user_settings_username ON user_settings(username);
        `;

        await this.db!.exec(initSQL);

        D1Storage.initialized = true;
        console.log('[D1] 数据库初始化完成');
      } catch (error) {
        console.error('[D1] 数据库初始化失败:', error);
        // 初始化失败时重置状态，允许下次重试
        D1Storage.initPromise = null;
        throw error;
      }
    })();

    return D1Storage.initPromise;
  }

  // 播放记录相关
  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first<D1PlayRecordRow>();

      if (!result) return null;

      return {
        title: result.title,
        source_name: result.source_name,
        cover: result.cover,
        year: result.year,
        index: result.index_episode,
        total_episodes: result.total_episodes,
        play_time: result.play_time,
        total_time: result.total_time,
        save_time: result.save_time,
        search_title: result.search_title || '',
      };
    } catch (err) {
      console.error('Failed to get play record:', err);
      throw err;
    }
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO play_records 
          (username, key, title, source_name, cover, year, index_episode, total_episodes, play_time, total_time, save_time, search_title)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .bind(
          userName,
          key,
          record.title,
          record.source_name,
          record.cover,
          record.year,
          record.index,
          record.total_episodes,
          record.play_time,
          record.total_time,
          record.save_time,
          record.search_title || null,
        )
        .run();
    } catch (err) {
      console.error('Failed to set play record:', err);
      throw err;
    }
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<Record<string, PlayRecord>> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT * FROM play_records WHERE username = ? ORDER BY save_time DESC',
        )
        .bind(userName)
        .all<D1PlayRecordRow>();

      const records: Record<string, PlayRecord> = {};

      result.results.forEach((row) => {
        records[row.key] = {
          title: row.title,
          source_name: row.source_name,
          cover: row.cover,
          year: row.year,
          index: row.index_episode,
          total_episodes: row.total_episodes,
          play_time: row.play_time,
          total_time: row.total_time,
          save_time: row.save_time,
          search_title: row.search_title || '',
        };
      });

      return records;
    } catch (err) {
      console.error('Failed to get all play records:', err);
      throw err;
    }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM play_records WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('Failed to delete play record:', err);
      throw err;
    }
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM play_records WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      console.error('Failed to delete all play records:', err);
      throw err;
    }
  }

  // 收藏相关
  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first<D1FavoriteRow>();

      if (!result) return null;

      return {
        title: result.title,
        source_name: result.source_name,
        cover: result.cover,
        year: result.year,
        total_episodes: result.total_episodes,
        save_time: result.save_time,
        search_title: result.search_title || '',
      };
    } catch (err) {
      console.error('Failed to get favorite:', err);
      throw err;
    }
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO favorites 
          (username, key, title, source_name, cover, year, total_episodes, save_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .bind(
          userName,
          key,
          favorite.title,
          favorite.source_name,
          favorite.cover,
          favorite.year,
          favorite.total_episodes,
          favorite.save_time,
        )
        .run();
    } catch (err) {
      console.error('Failed to set favorite:', err);
      throw err;
    }
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT * FROM favorites WHERE username = ? ORDER BY save_time DESC',
        )
        .bind(userName)
        .all<D1FavoriteRow>();

      const favorites: Record<string, Favorite> = {};

      result.results.forEach((row) => {
        favorites[row.key] = {
          title: row.title,
          source_name: row.source_name,
          cover: row.cover,
          year: row.year,
          total_episodes: row.total_episodes,
          save_time: row.save_time,
          search_title: row.search_title || '',
        };
      });

      return favorites;
    } catch (err) {
      console.error('Failed to get all favorites:', err);
      throw err;
    }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM favorites WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('Failed to delete favorite:', err);
      throw err;
    }
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM favorites WHERE username = ?')
        .bind(userName)
        .run();
    } catch (err) {
      console.error('Failed to delete all favorites:', err);
      throw err;
    }
  }

  // 用户相关
  async registerUser(userName: string, password: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
        .bind(userName, password)
        .run();
    } catch (err) {
      console.error('Failed to register user:', err);
      throw err;
    }
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT password FROM users WHERE username = ?')
        .bind(userName)
        .first<{ password: string }>();

      return result?.password === password;
    } catch (err) {
      console.error('Failed to verify user:', err);
      throw err;
    }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT 1 FROM users WHERE username = ?')
        .bind(userName)
        .first();

      return result !== null;
    } catch (err) {
      console.error('Failed to check user existence:', err);
      throw err;
    }
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('UPDATE users SET password = ? WHERE username = ?')
        .bind(newPassword, userName)
        .run();
    } catch (err) {
      console.error('Failed to change password:', err);
      throw err;
    }
  }

  async deleteUser(userName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const statements = [
        db.prepare('DELETE FROM users WHERE username = ?').bind(userName),
        db
          .prepare('DELETE FROM play_records WHERE username = ?')
          .bind(userName),
        db.prepare('DELETE FROM favorites WHERE username = ?').bind(userName),
        db
          .prepare('DELETE FROM search_history WHERE username = ?')
          .bind(userName),
      ];

      await db.batch(statements);
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  }

  // 搜索历史相关
  async getSearchHistory(userName: string): Promise<string[]> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT keyword FROM search_history WHERE username = ? ORDER BY created_at DESC LIMIT ?',
        )
        .bind(userName, SEARCH_HISTORY_LIMIT)
        .all<{ keyword: string }>();

      return result.results.map((row) => row.keyword);
    } catch (err) {
      console.error('Failed to get search history:', err);
      throw err;
    }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    try {
      const db = await this.getDatabase();

      // 使用 batch 将多个操作合并为一次事务，减少数据库往返
      await db.batch([
        // 1. 删除可能存在的重复记录
        db
          .prepare(
            'DELETE FROM search_history WHERE username = ? AND keyword = ?',
          )
          .bind(userName, keyword),
        // 2. 添加新记录
        db
          .prepare('INSERT INTO search_history (username, keyword) VALUES (?, ?)')
          .bind(userName, keyword),
        // 3. 保持历史记录条数限制
        db
          .prepare(
            `
            DELETE FROM search_history
            WHERE username = ? AND id NOT IN (
              SELECT id FROM search_history
              WHERE username = ?
              ORDER BY created_at DESC
              LIMIT ?
            )
          `,
          )
          .bind(userName, userName, SEARCH_HISTORY_LIMIT),
      ]);
    } catch (err) {
      console.error('Failed to add search history:', err);
      throw err;
    }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      if (keyword) {
        await db
          .prepare(
            'DELETE FROM search_history WHERE username = ? AND keyword = ?',
          )
          .bind(userName, keyword)
          .run();
      } else {
        await db
          .prepare('DELETE FROM search_history WHERE username = ?')
          .bind(userName)
          .run();
      }
    } catch (err) {
      console.error('Failed to delete search history:', err);
      throw err;
    }
  }

  // 用户列表
  async getAllUsers(): Promise<string[]> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT username FROM users ORDER BY created_at ASC')
        .all<{ username: string }>();

      return result.results.map((row) => row.username);
    } catch (err) {
      console.error('Failed to get all users:', err);
      throw err;
    }
  }

  // 管理员配置相关
  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare(
          'SELECT config_value as config FROM admin_configs WHERE config_key = ? LIMIT 1',
        )
        .bind('main_config')
        .first<{ config: string }>();

      if (!result) return null;

      return JSON.parse(result.config) as AdminConfig;
    } catch (err) {
      console.error('Failed to get admin config:', err);
      throw err;
    }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          'INSERT OR REPLACE INTO admin_configs (config_key, config_value, description) VALUES (?, ?, ?)',
        )
        .bind('main_config', JSON.stringify(config), '主要管理员配置')
        .run();
    } catch (err) {
      console.error('Failed to set admin config:', err);
      throw err;
    }
  }

  // 跳过配置相关
  async getSkipConfig(
    userName: string,
    key: string,
  ): Promise<EpisodeSkipConfig | null> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM skip_configs WHERE username = ? AND key = ?')
        .bind(userName, key)
        .first<D1SkipConfigRow>();

      if (!result) return null;

      return {
        source: result.source,
        id: result.video_id,
        title: result.title,
        segments: JSON.parse(result.segments),
        updated_time: result.updated_time,
      };
    } catch (err) {
      console.error('Failed to get skip config:', err);
      throw err;
    }
  }

  async setSkipConfig(
    userName: string,
    key: string,
    config: EpisodeSkipConfig,
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO skip_configs 
          (username, key, source, video_id, title, segments, updated_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .bind(
          userName,
          key,
          config.source,
          config.id,
          config.title,
          JSON.stringify(config.segments),
          config.updated_time,
        )
        .run();
    } catch (err) {
      console.error('Failed to set skip config:', err);
      throw err;
    }
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    try {
      const db = await this.getDatabase();
      const result = await db
        .prepare('SELECT * FROM skip_configs WHERE username = ?')
        .bind(userName)
        .all<D1SkipConfigRow>();

      const configs: { [key: string]: EpisodeSkipConfig } = {};

      for (const row of result.results) {
        configs[row.key] = {
          source: row.source,
          id: row.video_id,
          title: row.title,
          segments: JSON.parse(row.segments),
          updated_time: row.updated_time,
        };
      }

      return configs;
    } catch (err) {
      console.error('Failed to get all skip configs:', err);
      throw err;
    }
  }

  async deleteSkipConfig(userName: string, key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare('DELETE FROM skip_configs WHERE username = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch (err) {
      console.error('Failed to delete skip config:', err);
      throw err;
    }
  }

  // ---------- 用户设置 ----------
  async getUserSettings(userName: string): Promise<UserSettings | null> {
    try {
      const db = await this.getDatabase();
      const row = await db
        .prepare('SELECT settings FROM user_settings WHERE username = ?')
        .bind(userName)
        .first<D1UserSettingsRow>();

      if (row && row.settings) {
        return JSON.parse(row.settings as string) as UserSettings;
      }
      return null;
    } catch (err) {
      console.error('Failed to get user settings:', err);
      throw err;
    }
  }

  async setUserSettings(
    userName: string,
    settings: UserSettings,
  ): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db
        .prepare(
          `
          INSERT OR REPLACE INTO user_settings (username, settings, updated_time)
          VALUES (?, ?, ?)
        `,
        )
        .bind(userName, JSON.stringify(settings), Date.now())
        .run();
    } catch (err) {
      console.error('Failed to set user settings:', err);
      throw err;
    }
  }

  async updateUserSettings(
    userName: string,
    settings: Partial<UserSettings>,
  ): Promise<void> {
    const current = await this.getUserSettings(userName);
    const defaultSettings: Omit<UserSettings, 'filter_adult_content'> = {
      theme: 'auto',
      language: 'zh-CN',
      auto_play: false,
      video_quality: 'auto',
    };
    const merged = {
      ...defaultSettings,
      ...(current ?? {}),
      ...settings,
    } as Partial<UserSettings>;
    const updated: UserSettings = {
      filter_adult_content:
        settings.filter_adult_content ?? current?.filter_adult_content ?? true,
      theme: merged.theme ?? 'auto',
      language: merged.language ?? 'zh-CN',
      auto_play: merged.auto_play ?? false,
      video_quality: merged.video_quality ?? 'auto',
    };
    await this.setUserSettings(userName, updated);
  }
}

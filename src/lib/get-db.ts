/* eslint-disable @typescript-eslint/no-explicit-any */

import { DbManager } from './db';
import { logError } from './logger';

/**
 * 获取数据库管理器实例
 *
 * 在 Cloudflare Workers 环境中，D1 数据库需要为每个请求获取 DB 绑定。
 * 此函数会自动检测环境并在 Cloudflare Workers 中使用动态导入获取 DB 实例。
 *
 * 用法：
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const db = await getDb();
 *   const records = await db.getAllPlayRecords(username);
 *   // ...
 * }
 * ```
 */
export async function getDb(): Promise<DbManager> {
  // 检查是否在 Cloudflare Workers 环境中
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;

  if (storageType === 'd1') {
    try {
      // 使用动态导入避免 ESM/CommonJS 冲突
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const context = getCloudflareContext();

      // 传入 D1 数据库实例
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new DbManager((context.env as any).DB);
    } catch (error) {
      logError('[getDb] 无法获取 Cloudflare Context', error);
      // 降级：返回不带 DB 实例的 DbManager（开发环境）
      return new DbManager();
    }
  }

  // 其他存储类型（localStorage, redis, kvrocks, upstash）
  return new DbManager();
}

/**
 * 广告过滤自定义HLS Loader
 * 使用组合模式包装默认 Loader
 */

import Hls from 'hls.js';

import { logInfo } from '@/lib/logger';

/**
 * 从M3U8内容中过滤广告
 * 支持多种广告特征检测
 */
function filterAdsFromM3U8(m3u8Content: string): string {
  if (!m3u8Content) return '';

  // 按行分割M3U8内容
  const lines = m3u8Content.split('\n');
  const filteredLines: string[] = [];
  let skipNext = false; // 标记是否跳过下一个片段
  let removedCount = 0;

  // 广告URL特征关键词
  const adKeywords = [
    'ad.',
    'ads.',
    'adv.',
    'advert',
    'commercial',
    'preroll',
    'midroll',
    'sponsor',
    'promotion',
  ];

  // 广告URL正则模式
  const adPatterns = [
    /ad[_-]?\d+/i, // ad_1, ad-2, ad3
    /advert[_-]?\d+/i, // advert_1, advert-2
    /commercial[_-]?\d+/i, // commercial_1
    /-ad-/i, // xxx-ad-xxx
    /\/ad\//i, // xxx/ad/xxx
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // 1. 过滤 #EXT-X-DISCONTINUITY 标记（主要广告分隔符）
    if (line.includes('#EXT-X-DISCONTINUITY')) {
      skipNext = true; // 标记下一个.ts片段可能是广告
      removedCount++;
      continue;
    }

    // 2. 检测广告URL特征关键词
    const hasAdKeyword = adKeywords.some((keyword) =>
      lineLower.includes(keyword)
    );
    if (hasAdKeyword && (line.endsWith('.ts') || line.endsWith('.m3u8'))) {
      if (process.env.NODE_ENV === 'development') {
        logInfo(`[广告过滤] 关键词匹配: ${line.substring(0, 50)}...`);
      }
      removedCount++;
      continue;
    }

    // 3. 检测广告URL正则模式
    const matchesAdPattern = adPatterns.some((pattern) =>
      pattern.test(lineLower)
    );
    if (matchesAdPattern && (line.endsWith('.ts') || line.endsWith('.m3u8'))) {
      if (process.env.NODE_ENV === 'development') {
        logInfo(`[广告过滤] 正则匹配: ${line.substring(0, 50)}...`);
      }
      removedCount++;
      continue;
    }

    // 4. 如果上一行是 DISCONTINUITY，且当前是视频片段，可能是广告
    if (skipNext && (line.endsWith('.ts') || line.endsWith('.m3u8'))) {
      // 只跳过第一个片段，避免误删
      if (process.env.NODE_ENV === 'development') {
        logInfo(`[广告过滤] DISCONTINUITY后片段: ${line.substring(0, 50)}...`);
      }
      skipNext = false;
      removedCount++;
      continue;
    }

    // 5. 检测 #EXTINF 标签中的短时长（广告通常较短）
    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([\d.]+)/);
      if (match) {
        const duration = parseFloat(match[1]);
        // 如果片段时长小于3秒，可能是广告或片头
        if (duration > 0 && duration < 3) {
          // 标记下一行可能需要跳过
          skipNext = true;
        }
      }
    }

    skipNext = false;
    filteredLines.push(line);
  }

  // 开发环境输出统计信息
  if (process.env.NODE_ENV === 'development' && removedCount > 0) {
    logInfo(`[广告过滤] 共移除 ${removedCount} 个广告相关标记/片段`);
  }

  return filteredLines.join('\n');
}

/**
 * 创建带广告过滤的自定义 HLS Loader
 * 使用组合模式包装默认 Loader
 */
export function createAdFilterLoader() {
  const DefaultLoader = Hls.DefaultConfig.loader;

  return class AdFilterLoader {
    private loader: InstanceType<typeof DefaultLoader>;

    constructor(config: unknown) {
      this.loader = new DefaultLoader(
        config as ConstructorParameters<typeof DefaultLoader>[0]
      );
    }

    destroy() {
      if (this.loader.destroy) {
        this.loader.destroy();
      }
    }

    abort() {
      if (this.loader.abort) {
        this.loader.abort();
      }
    }

    load(
      context: unknown,
      config: unknown,
      callbacks: Record<string, unknown>
    ) {
      const ctx = context as { type?: string };
      const isInterceptTarget = ctx.type === 'manifest' || ctx.type === 'level';

      if (isInterceptTarget && callbacks.onSuccess) {
        const originalOnSuccess = callbacks.onSuccess as (
          response: { data?: string },
          stats: unknown,
          context: unknown,
          networkDetails?: unknown
        ) => void;

        callbacks.onSuccess = (
          response: { data?: string },
          stats: unknown,
          callbackContext: unknown,
          networkDetails?: unknown
        ) => {
          if (response.data && typeof response.data === 'string') {
            response.data = filterAdsFromM3U8(response.data);
          }
          return originalOnSuccess(
            response,
            stats,
            callbackContext,
            networkDetails
          );
        };
      }

      this.loader.load(context as any, config as any, callbacks as any);
    }

    get context() {
      return this.loader.context;
    }

    get stats() {
      return this.loader.stats;
    }
  };
}

/**
 * 自定义HLS Loader类，用于向后兼容
 */
export const CustomHlsJsLoader = createAdFilterLoader();

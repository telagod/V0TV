/**
 * 广告过滤自定义HLS Loader
 * 使用组合模式包装默认 Loader
 */

import Hls from 'hls.js';

import { logInfo } from '@/lib/logger';

/**
 * 从M3U8内容中过滤广告
 * 仅过滤明确的广告URL特征，保留 DISCONTINUITY 标记以避免破坏正常视频
 */
function filterAdsFromM3U8(m3u8Content: string): string {
  if (!m3u8Content) return '';

  // 按行分割M3U8内容
  const lines = m3u8Content.split('\n');
  const filteredLines: string[] = [];
  let removedCount = 0;
  let skipNextSegment = false; // 是否跳过下一个视频片段（及其 EXTINF）

  // 广告URL特征关键词（更严格的匹配）
  const adKeywords = [
    '/ad/',
    '/ads/',
    '/advert/',
    '/commercial/',
    '/preroll/',
    '/midroll/',
    '/sponsor/',
    'advertisement',
  ];

  // 广告URL正则模式（更精确）
  const adPatterns = [
    /\/ad[_-]?\d+\//i, // /ad_1/, /ad-2/
    /\/advert[_-]?\d+\//i, // /advert_1/
    /\/commercial[_-]?\d+\//i, // /commercial_1/
    /[?&]ad[_=]/i, // ?ad= 或 &ad_
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineLower = line.toLowerCase();

    // 空行直接保留
    if (!line) {
      filteredLines.push(lines[i]);
      continue;
    }

    // 检测是否为视频片段URL（.ts 或 .m3u8 结尾，或包含这些扩展名后跟查询参数）
    const isSegmentUrl =
      /\.(ts|m3u8)($|\?)/i.test(line) && !line.startsWith('#');

    if (isSegmentUrl) {
      // 检测广告URL特征关键词
      const hasAdKeyword = adKeywords.some((keyword) =>
        lineLower.includes(keyword),
      );

      // 检测广告URL正则模式
      const matchesAdPattern = adPatterns.some((pattern) =>
        pattern.test(lineLower),
      );

      if (hasAdKeyword || matchesAdPattern) {
        if (process.env.NODE_ENV === 'development') {
          logInfo(`[广告过滤] 移除广告片段: ${line.substring(0, 60)}...`);
        }
        removedCount++;
        // 同时需要移除前面的 #EXTINF 行（如果已添加）
        if (
          filteredLines.length > 0 &&
          filteredLines[filteredLines.length - 1].startsWith('#EXTINF:')
        ) {
          filteredLines.pop();
        }
        continue;
      }

      // 如果标记了跳过下一个片段
      if (skipNextSegment) {
        if (process.env.NODE_ENV === 'development') {
          logInfo(`[广告过滤] 跳过标记片段: ${line.substring(0, 60)}...`);
        }
        removedCount++;
        skipNextSegment = false;
        // 同时移除前面的 #EXTINF 行
        if (
          filteredLines.length > 0 &&
          filteredLines[filteredLines.length - 1].startsWith('#EXTINF:')
        ) {
          filteredLines.pop();
        }
        continue;
      }
    }

    // 检测 #EXTINF 标签：仅当片段时长极短（<1秒）且后续URL包含广告特征时才跳过
    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([\d.]+)/);
      if (match) {
        const duration = parseFloat(match[1]);
        // 检查下一行是否是广告URL
        const nextLine = lines[i + 1]?.toLowerCase() || '';
        const nextIsAd =
          adKeywords.some((k) => nextLine.includes(k)) ||
          adPatterns.some((p) => p.test(nextLine));

        // 仅当时长极短且下一行是广告时才跳过
        if (duration > 0 && duration < 1 && nextIsAd) {
          skipNextSegment = true;
          removedCount++;
          continue;
        }
      }
    }

    // 保留 #EXT-X-DISCONTINUITY 标记（这是正常的HLS标记，不应删除）
    // 保留所有其他行
    filteredLines.push(lines[i]);
  }

  // 开发环境输出统计信息
  if (process.env.NODE_ENV === 'development' && removedCount > 0) {
    logInfo(`[广告过滤] 共移除 ${removedCount} 个广告相关片段`);
  }

  return filteredLines.join('\n');
}

/**
 * 创建带广告过滤的自定义 HLS Loader
 * 使用组合模式包装默认 Loader
 */
export function createAdFilterLoader() {
  const DefaultLoader = Hls.DefaultConfig.loader;
  type DefaultLoaderInstance = InstanceType<typeof DefaultLoader>;
  type DefaultLoadArgs = Parameters<DefaultLoaderInstance['load']>;

  return class AdFilterLoader {
    private loader: InstanceType<typeof DefaultLoader>;

    constructor(config: unknown) {
      this.loader = new DefaultLoader(
        config as ConstructorParameters<typeof DefaultLoader>[0],
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
      callbacks: Record<string, unknown>,
    ) {
      const ctx = context as { type?: string };
      const isInterceptTarget = ctx.type === 'manifest' || ctx.type === 'level';

      if (isInterceptTarget && callbacks.onSuccess) {
        const originalOnSuccess = callbacks.onSuccess as (
          response: { data?: string },
          stats: unknown,
          context: unknown,
          networkDetails?: unknown,
        ) => void;

        callbacks.onSuccess = (
          response: { data?: string },
          stats: unknown,
          callbackContext: unknown,
          networkDetails?: unknown,
        ) => {
          if (response.data && typeof response.data === 'string') {
            response.data = filterAdsFromM3U8(response.data);
          }
          return originalOnSuccess(
            response,
            stats,
            callbackContext,
            networkDetails,
          );
        };
      }

      this.loader.load(
        context as DefaultLoadArgs[0],
        config as DefaultLoadArgs[1],
        callbacks as unknown as DefaultLoadArgs[2],
      );
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

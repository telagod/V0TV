/**
 * 广告过滤自定义HLS Loader
 */

import Hls from 'hls.js';

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
        console.log(`[广告过滤] 关键词匹配: ${line.substring(0, 50)}...`);
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
        console.log(`[广告过滤] 正则匹配: ${line.substring(0, 50)}...`);
      }
      removedCount++;
      continue;
    }

    // 4. 如果上一行是 DISCONTINUITY，且当前是视频片段，可能是广告
    if (skipNext && (line.endsWith('.ts') || line.endsWith('.m3u8'))) {
      // 只跳过第一个片段，避免误删
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[广告过滤] DISCONTINUITY后片段: ${line.substring(0, 50)}...`
        );
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
    console.log(`[广告过滤] 共移除 ${removedCount} 个广告相关标记/片段`);
  }

  return filteredLines.join('\n');
}

/**
 * 自定义HLS Loader，支持广告过滤
 */
export class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
  constructor(config: any) {
    super(config);
    const load = this.load.bind(this);
    this.load = function (context: any, config: any, callbacks: any) {
      // 拦截manifest和level请求
      if (
        (context as any).type === 'manifest' ||
        (context as any).type === 'level'
      ) {
        const onSuccess = callbacks.onSuccess;
        callbacks.onSuccess = function (
          response: any,
          stats: any,
          context: any
        ) {
          // 如果是m3u8文件，处理内容以移除广告分段
          if (response.data && typeof response.data === 'string') {
            // 过滤掉广告段
            response.data = filterAdsFromM3U8(response.data);
          }
          return onSuccess(response, stats, context, null);
        };
      }
      // 执行原始load方法
      load(context, config, callbacks);
    };
  }
}

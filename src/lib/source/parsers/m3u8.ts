/**
 * M3U8 解析器
 * 负责从各种格式中提取可播放链接（m3u8/mp4 等）
 */

import { PlaySource, PRIORITY_RULES } from '../types';

// ============================================================================
// 常量
// ============================================================================

/** 从文本中提取 URL（降级兜底，不包含空格/引号/尖括号） */
const ANY_URL_PATTERN = /https?:\/\/[^"'\s<>]+/g;

/** URL 验证排除路径 */
const EXCLUDE_PATHS = [
  '/redirect/',
  '/jump/',
  '/play.html',
  '/player.html',
  '/go.php',
];

/** 允许作为“直连可播放地址”的常见后缀 */
const PLAYABLE_EXTENSIONS = ['.m3u8', '.mp4', '.m4v'] as const;

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 验证播放 URL 是否有效（尽量避免把中转页/播放器页当成可播放地址）
 */
export function isValidPlayUrl(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);

    // 协议检查
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    const pathnameLower = urlObj.pathname.toLowerCase();
    const isDirectPlayable = PLAYABLE_EXTENSIONS.some((ext) =>
      pathnameLower.endsWith(ext),
    );

    // 电影天堂分享链接（常见为跳转/重定向到真实播放地址）
    const isDyttShare =
      (urlObj.hostname.includes('dytt-cine.com') ||
        urlObj.hostname.includes('dytt')) &&
      urlObj.pathname.includes('/share');

    if (!isDirectPlayable && !isDyttShare) return false;

    // 排除中转页面
    if (EXCLUDE_PATHS.some((path) => urlObj.pathname.includes(path))) {
      return false;
    }

    // 域名有效性
    if (!urlObj.hostname || urlObj.hostname === 'localhost') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// 兼容旧命名：历史上仅校验 m3u8，如今统一为“可播放 URL”校验
export const isValidM3u8Url = isValidPlayUrl;

/**
 * 计算播放源优先级
 */
export function calculatePriority(sourceName: string): number {
  const lowerName = sourceName.toLowerCase();

  for (const rule of PRIORITY_RULES) {
    if (rule.keywords.some((kw) => lowerName.includes(kw))) {
      return rule.priority;
    }
  }

  return 99; // 默认最低优先级
}

/**
 * 清理 M3U8 链接
 * 去除前缀 $、括号内容等
 */
export function cleanM3u8Link(link: string): string {
  // 去掉开头的 $
  let cleaned = link.startsWith('$') ? link.substring(1) : link;

  // 去掉括号及后面的内容
  const parenIndex = cleaned.indexOf('(');
  if (parenIndex > 0) {
    cleaned = cleaned.substring(0, parenIndex);
  }

  return cleaned;
}

// ============================================================================
// 核心解析函数
// ============================================================================

function extractEpisodeUrlsFromSourceChunk(chunk: string): string[] {
  const urls: string[] = [];
  // 常见格式：第1集$https://...m3u8#第2集$https://...m3u8
  for (const part of chunk.split('#')) {
    const lastDollarIndex = part.lastIndexOf('$');
    if (lastDollarIndex >= 0 && lastDollarIndex < part.length - 1) {
      urls.push(part.slice(lastDollarIndex + 1).trim());
      continue;
    }
    const any = part.match(ANY_URL_PATTERN) || [];
    urls.push(...any);
  }
  return urls.filter(Boolean);
}

/**
 * 从 vod_play_url 中提取所有播放源
 *
 * @param vodPlayUrl - 播放 URL 字符串 (格式: 源1数据$$$源2数据)
 * @param vodPlayFrom - 播放源名称 (格式: 源1名$$$源2名)
 * @param validate - 是否验证链接有效性
 * @returns 播放源数组，按优先级排序
 */
export function extractPlaySources(
  vodPlayUrl: string,
  vodPlayFrom?: string,
  validate = false,
): PlaySource[] {
  if (!vodPlayUrl) return [];

  const playSources = vodPlayUrl.split('$$$');
  const sourceNames = vodPlayFrom?.split('$$$') || [];
  const results: PlaySource[] = [];

  playSources.forEach((source, index) => {
    const sourceName = sourceNames[index] || `播放源${index + 1}`;

    // 提取链接（尽量使用结构化分隔符解析，避免把 # 后面的内容吞掉）
    const extracted = extractEpisodeUrlsFromSourceChunk(source);

    // 清理并去重
    let episodes = Array.from(new Set(extracted)).map(cleanM3u8Link);

    // 可选验证
    if (validate) {
      episodes = episodes.filter(isValidPlayUrl);
    }

    if (episodes.length > 0) {
      results.push({
        name: sourceName,
        episodes,
        priority: calculatePriority(sourceName),
      });
    }
  });

  // 按优先级排序
  return results.sort((a, b) => a.priority - b.priority);
}

/**
 * 使用自定义正则提取 M3U8 链接
 *
 * @param html - HTML 内容
 * @param pattern - 主正则
 * @param fallbackPattern - 降级正则
 * @returns 链接数组
 */
export function extractM3u8WithPattern(
  html: string,
  pattern: RegExp,
  fallbackPattern?: RegExp,
): string[] {
  // 尝试主正则
  let matches = html.match(pattern) || [];

  // 降级尝试
  if (matches.length === 0 && fallbackPattern) {
    matches = html.match(fallbackPattern) || [];
  }

  // 通用降级：抓取页面内所有 URL，再做白名单校验
  if (matches.length === 0) {
    matches = html.match(ANY_URL_PATTERN) || [];
  }

  // 清理、去重、验证
  const cleaned = Array.from(new Set(matches)).map(cleanM3u8Link);
  return cleaned.filter(isValidPlayUrl);
}

/**
 * 从内容中降级提取 M3U8 (当主方式失败时)
 */
export function extractM3u8Fallback(content: string): string[] {
  const matches = content.match(ANY_URL_PATTERN) || [];
  const cleaned = matches.map((link) => link.replace(/^\$/, ''));
  return cleaned.filter(isValidPlayUrl);
}

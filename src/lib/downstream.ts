import { API_CONFIG, ApiSite, getConfig } from '@/lib/config';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { requestManager } from '@/lib/request-manager';
import { PlaySource, SearchResult } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

interface ApiSearchItem {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks?: string;
  vod_play_url?: string;
  vod_play_from?: string;
  vod_class?: string;
  vod_year?: string;
  vod_content?: string;
  vod_douban_id?: number;
  type_name?: string;
}

interface ApiSearchResponse {
  list?: ApiSearchItem[];
  pagecount?: number;
}

type ApiDetailResponse = ApiSearchResponse;

// ============================================================================
// 特殊源处理器配置
// ============================================================================

/**
 * 特殊源处理器接口
 */
interface SpecialSourceHandler {
  key: string; // 源标识（如 ffzy, lzzy）
  name: string; // 源名称
  detailUrlTemplate: string; // 详情页URL模板
  m3u8Pattern: RegExp; // M3U8链接提取正则
  fallbackPattern?: RegExp; // 降级正则
}

/**
 * 特殊源处理器配置表
 */
const SPECIAL_SOURCE_HANDLERS: Record<string, SpecialSourceHandler> = {
  // 非凡资源
  ffzy: {
    key: 'ffzy',
    name: '非凡资源',
    detailUrlTemplate: '/index.php/vod/detail/id/{id}.html',
    m3u8Pattern: /\$(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g,
    fallbackPattern: /\$(https?:\/\/[^"'\s]+?\.m3u8)/g,
  },

  // 量子资源
  lzzy: {
    key: 'lzzy',
    name: '量子资源',
    detailUrlTemplate: '/index.php/vod/detail/id/{id}.html',
    m3u8Pattern: /\$(https?:\/\/[^"'\s]+?\/\d{8}\/[^"'\s]+?\.m3u8)/g,
    fallbackPattern: /\$(https?:\/\/[^"'\s]+?\.m3u8)/g,
  },

  // 采集资源
  ckzy: {
    key: 'ckzy',
    name: '采集资源',
    detailUrlTemplate: '/index.php/vod/detail/id/{id}.html',
    m3u8Pattern: /\$(https?:\/\/[^"'\s]+?\/\d{8}\/[^"'\s]+?\.m3u8)/g,
    fallbackPattern: /\$(https?:\/\/[^"'\s]+?\.m3u8)/g,
  },
};

/**
 * 检查是否为特殊源
 */
function isSpecialSource(apiSite: ApiSite): boolean {
  return !!(apiSite.detail || SPECIAL_SOURCE_HANDLERS[apiSite.key]);
}

/**
 * 获取特殊源处理器
 */
function getSpecialSourceHandler(
  apiSite: ApiSite
): SpecialSourceHandler | null {
  return SPECIAL_SOURCE_HANDLERS[apiSite.key] || null;
}

// ============================================================================
// 日志工具
// ============================================================================

/**
 * 日志级别
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 开发模式日志工具
 */
class Logger {
  private static isDev = process.env.NODE_ENV === 'development';
  private static minLevel = LogLevel.DEBUG;

  static debug(category: string, message: string, data?: unknown): void {
    if (!this.isDev || this.minLevel > LogLevel.DEBUG) return;
    logInfo(`[${category}] ${message}`, data);
  }

  static info(category: string, message: string, data?: unknown): void {
    if (!this.isDev || this.minLevel > LogLevel.INFO) return;
    logInfo(`[${category}] ${message}`, data);
  }

  static warn(category: string, message: string, data?: unknown): void {
    if (!this.isDev || this.minLevel > LogLevel.WARN) return;
    logWarn(`[${category}] ⚠️  ${message}`, data);
  }

  static error(
    category: string,
    message: string,
    error?: Error | unknown
  ): void {
    if (!this.isDev || this.minLevel > LogLevel.ERROR) return;
    logError(`[${category}] ❌ ${message}`, error);
  }

  static success(category: string, message: string, data?: unknown): void {
    if (!this.isDev) return;
    logInfo(`[${category}] ✅ ${message}`, data);
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 验证M3U8 URL是否有效
 * 过滤掉中转页面、分享页面等无效链接
 */
function isValidM3u8Url(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);

    // 1. 检查协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      Logger.warn('URL验证', `无效协议: ${url}`);
      return false;
    }

    // 2. 检查扩展名
    if (!urlObj.pathname.toLowerCase().endsWith('.m3u8')) {
      Logger.warn('URL验证', `非M3U8文件: ${url}`);
      return false;
    }

    // 3. 排除已知的中转页面路径
    const excludePaths = [
      '/share/', // 分享页面（如 dytt 的 /share/xxx）
      '/redirect/', // 重定向页面
      '/jump/', // 跳转页面
      '/play.html', // HTML播放器页面
      '/player.html', // HTML播放器页面
      '/go.php', // 跳转脚本
    ];

    if (excludePaths.some((path) => urlObj.pathname.includes(path))) {
      Logger.warn('URL验证', `中转页面（已过滤）: ${url}`);
      return false;
    }

    // 4. 检查域名格式
    if (!urlObj.hostname || urlObj.hostname === 'localhost') {
      Logger.warn('URL验证', `无效域名: ${url}`);
      return false;
    }

    // 5. 推荐的路径格式检查（不强制，只警告）
    const hasDatePath = /\/\d{8,}\//.test(urlObj.pathname);
    if (!hasDatePath) {
      Logger.debug('URL验证', `非标准日期路径格式（但仍接受）: ${url}`);
    }

    return true;
  } catch (error) {
    Logger.error('URL验证', `解析失败: ${url}`, error);
    return false;
  }
}

/**
 * 从 vod_play_url 中提取所有播放源的M3U8链接
 * 支持多播放源，自动选择最优源
 *
 * @param vodPlayUrl - API返回的播放URL字符串（格式：源1数据$$$源2数据）
 * @param vodPlayFrom - 播放源名称字符串（格式：源1名$$$源2名）
 * @returns 播放源数组，按优先级排序
 */
function extractAllPlaySources(
  vodPlayUrl: string,
  vodPlayFrom?: string
): PlaySource[] {
  if (!vodPlayUrl) return [];

  const playSources = vodPlayUrl.split('$$$');
  const sourceNames = vodPlayFrom?.split('$$$') || [];

  const results: PlaySource[] = [];

  playSources.forEach((source, index) => {
    const sourceName = sourceNames[index] || `播放源${index + 1}`;

    // 方法1：从标准格式提取（第01集$url#第02集$url）
    const episodeList = source.split('#');
    let episodes: string[] = [];

    episodeList.forEach((ep: string) => {
      const parts = ep.split('$');
      if (parts.length > 1) {
        const url = parts[1];
        // 只提取以 http 开头且以 .m3u8 结尾的URL
        if (
          url &&
          (url.startsWith('http://') || url.startsWith('https://')) &&
          url.endsWith('.m3u8')
        ) {
          episodes.push(url);
        }
      }
    });

    // 方法2：如果方法1没提取到，使用正则提取
    if (episodes.length === 0) {
      // 优先：严格的正则（包含日期路径的标准格式）
      const strictRegex = /\$(https?:\/\/[^"'\s]+?\/\d{8,}[^"'\s]*?\.m3u8)/g;
      let matches = source.match(strictRegex) || [];

      // 降级：宽松的正则（所有.m3u8链接）
      if (matches.length === 0) {
        const looseRegex = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
        matches = source.match(looseRegex) || [];
      }

      // 清理链接（去掉开头的$和括号内容）
      episodes = matches.map((link: string) => {
        link = link.substring(1); // 去掉开头的 $
        const parenIndex = link.indexOf('(');
        return parenIndex > 0 ? link.substring(0, parenIndex) : link;
      });
    }

    // 过滤无效链接
    const validEpisodes = episodes.filter((url) => isValidM3u8Url(url));

    // 去重
    const uniqueEpisodes = Array.from(new Set(validEpisodes));

    if (uniqueEpisodes.length > 0) {
      // 计算优先级
      let priority = 99;
      const lowerName = sourceName.toLowerCase();

      // m3u8 关键词的源优先级最高
      if (lowerName.includes('m3u8')) {
        priority = 1;
      }
      // 包含"高清"的源次之
      else if (
        lowerName.includes('高清') ||
        lowerName.includes('hd') ||
        lowerName.includes('1080')
      ) {
        priority = 2;
      }
      // 包含"标清"的源再次之
      else if (
        lowerName.includes('标清') ||
        lowerName.includes('sd') ||
        lowerName.includes('720')
      ) {
        priority = 3;
      }
      // 量子、非凡等知名源
      else if (
        lowerName.includes('量子') ||
        lowerName.includes('非凡') ||
        lowerName.includes('ffzy')
      ) {
        priority = 4;
      }

      results.push({
        name: sourceName,
        episodes: uniqueEpisodes,
        priority,
      });

      Logger.success(
        '源解析',
        `${sourceName}: 提取到 ${uniqueEpisodes.length} 个有效链接，优先级 ${priority}`
      );
    } else {
      Logger.warn('源解析', `${sourceName}: 没有提取到有效的M3U8链接`);
    }
  });

  // 按优先级排序
  return results.sort((a, b) => a.priority - b.priority);
}

/**
 * 从年份字符串中提取有效年份
 * 支持各种格式：2024、2024-2025、24年等
 */
function extractYear(vodYear: string | null | undefined): string {
  if (!vodYear) return '';

  // 提取所有4位数字
  const years = vodYear.match(/\d{4}/g);
  if (!years || years.length === 0) return '';

  // 过滤出有效年份（1900-当前年份+1）
  const currentYear = new Date().getFullYear();
  const validYears = years
    .map((y) => parseInt(y))
    .filter((y) => y >= 1900 && y <= currentYear + 1);

  if (validYears.length === 0) return '';

  // 返回最大年份（最新）
  return Math.max(...validYears).toString();
}

export async function searchFromApi(
  apiSite: ApiSite,
  query: string
): Promise<SearchResult[]> {
  try {
    const apiBaseUrl = apiSite.api;
    const apiUrl =
      apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
    const apiName = apiSite.name;

    // 使用请求管理器（自动处理重试、熔断、并发控制）
    const data = await requestManager.fetch<ApiSearchResponse>(apiUrl, {
      headers: API_CONFIG.search.headers,
      timeout: 8000,
      retryOptions: {
        maxRetries: 2, // 搜索请求重试2次
      },
    });
    if (
      !data ||
      !data.list ||
      !Array.isArray(data.list) ||
      data.list.length === 0
    ) {
      return [];
    }
    // 处理第一页结果
    const results = data.list.map((item: ApiSearchItem) => {
      // ✅ 使用统一的提取函数，支持多播放源
      const playSources = extractAllPlaySources(
        item.vod_play_url || '',
        item.vod_play_from
      );

      // 主播放源（优先级最高的，向后兼容）
      const episodes = playSources[0]?.episodes || [];

      Logger.info(
        '搜索解析',
        `${item.vod_name}: 找到 ${playSources.length} 个播放源，${episodes.length} 个剧集`
      );

      return {
        id: item.vod_id.toString(),
        title: item.vod_name.trim().replace(/\s+/g, ' '),
        poster: item.vod_pic,

        // ✅ 新增：多播放源支持
        playSources,

        // 保留：主播放源（向后兼容）
        episodes,

        source: apiSite.key,
        source_name: apiName,
        class: item.vod_class,

        // ✅ 使用改进的年份提取函数
        year: extractYear(item.vod_year),

        desc: cleanHtmlTags(item.vod_content || ''),
        type_name: item.type_name,
        douban_id: item.vod_douban_id,
      };
    });

    const config = await getConfig();
    const MAX_SEARCH_PAGES: number = config.SiteConfig.SearchDownstreamMaxPage;

    // 获取总页数
    const pageCount = data.pagecount || 1;
    // 确定需要获取的额外页数
    const pagesToFetch = Math.min(pageCount - 1, MAX_SEARCH_PAGES - 1);

    // 如果有额外页数，获取更多页的结果
    if (pagesToFetch > 0) {
      const additionalPagePromises = [];

      for (let page = 2; page <= pagesToFetch + 1; page++) {
        const pageUrl =
          apiBaseUrl +
          API_CONFIG.search.pagePath
            .replace('{query}', encodeURIComponent(query))
            .replace('{page}', page.toString());

        const pagePromise = (async () => {
          try {
            // 使用请求管理器
            const pageData = await requestManager.fetch<ApiSearchResponse>(
              pageUrl,
              {
              headers: API_CONFIG.search.headers,
              timeout: 8000,
              retryOptions: {
                maxRetries: 1, // 分页请求只重试1次
              },
            }
            );

            if (!pageData || !pageData.list || !Array.isArray(pageData.list))
              return [];

            return pageData.list.map((item: ApiSearchItem) => {
              // ✅ 使用统一的提取函数（与第一页逻辑完全一致）
              const playSources = extractAllPlaySources(
                item.vod_play_url || '',
                item.vod_play_from
              );

              // 主播放源（优先级最高的，向后兼容）
              const episodes = playSources[0]?.episodes || [];

              Logger.info(
                '搜索解析-分页',
                `第${page}页 - ${item.vod_name}: 找到 ${playSources.length} 个播放源，${episodes.length} 个剧集`
              );

              return {
                id: item.vod_id.toString(),
                title: item.vod_name.trim().replace(/\s+/g, ' '),
                poster: item.vod_pic,

                // ✅ 新增：多播放源支持
                playSources,

                // 保留：主播放源（向后兼容）
                episodes,

                source: apiSite.key,
                source_name: apiName,
                class: item.vod_class,

                // ✅ 使用改进的年份提取函数
                year: extractYear(item.vod_year),

                desc: cleanHtmlTags(item.vod_content || ''),
                type_name: item.type_name,
                douban_id: item.vod_douban_id,
              };
            });
          } catch (error) {
            return [];
          }
        })();

        additionalPagePromises.push(pagePromise);
      }

      // 等待所有额外页的结果
      const additionalResults = await Promise.all(additionalPagePromises);

      // 合并所有页的结果
      additionalResults.forEach((pageResults) => {
        if (pageResults.length > 0) {
          results.push(...pageResults);
        }
      });
    }

    return results;
  } catch (error) {
    Logger.error('搜索解析', `${apiSite.name} 搜索失败`, {
      query,
      apiUrl: apiSite.api,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// 匹配 m3u8 链接的正则
const M3U8_PATTERN = /(https?:\/\/[^"'\s]+?\.m3u8)/g;

export async function getDetailFromApi(
  apiSite: ApiSite,
  id: string
): Promise<SearchResult> {
  if (isSpecialSource(apiSite)) {
    return handleSpecialSourceDetail(id, apiSite);
  }

  const detailUrl = `${apiSite.api}${API_CONFIG.detail.path}${id}`;

  Logger.debug('详情解析', `请求详情: ${apiSite.name} - ID: ${id}`);

  // 使用请求管理器（自动重试、熔断）
  const data = await requestManager.fetch<ApiDetailResponse>(detailUrl, {
    headers: API_CONFIG.detail.headers,
    timeout: 10000,
    retryOptions: {
      maxRetries: 3, // 详情请求重试3次
    },
  });

  if (
    !data ||
    !data.list ||
    !Array.isArray(data.list) ||
    data.list.length === 0
  ) {
    throw new Error('获取到的详情内容无效');
  }

  const videoDetail = data.list[0];

  // ✅ 使用统一的提取函数，支持多播放源
  let playSources = extractAllPlaySources(
    videoDetail.vod_play_url || '',
    videoDetail.vod_play_from
  );

  // 降级：如果播放源为空，尝试从 vod_content 中解析 m3u8
  if (playSources.length === 0 && videoDetail.vod_content) {
    const matches = videoDetail.vod_content.match(M3U8_PATTERN) || [];
    const validEpisodes = matches
      .map((link: string) => link.replace(/^\$/, ''))
      .filter((url: string) => isValidM3u8Url(url));

    if (validEpisodes.length > 0) {
      playSources = [
        {
          name: '内容提取',
          episodes: validEpisodes,
          priority: 99,
        },
      ];

      Logger.info(
        '详情解析-降级',
        `${videoDetail.vod_name}: 从内容中提取到 ${validEpisodes.length} 个链接`
      );
    }
  }

  // 主播放源（优先级最高的，向后兼容）
  const episodes = playSources[0]?.episodes || [];

  Logger.success(
    '详情解析',
    `${videoDetail.vod_name}: 找到 ${playSources.length} 个播放源，${episodes.length} 个剧集`
  );

  return {
    id: id.toString(),
    title: videoDetail.vod_name,
    poster: videoDetail.vod_pic,

    // ✅ 新增：多播放源支持
    playSources,

    // 保留：主播放源（向后兼容）
    episodes,

    source: apiSite.key,
    source_name: apiSite.name,
    class: videoDetail.vod_class,

    // ✅ 使用改进的年份提取函数
    year: extractYear(videoDetail.vod_year),

    desc: cleanHtmlTags(videoDetail.vod_content),
    type_name: videoDetail.type_name,
    douban_id: videoDetail.vod_douban_id,
  };
}

async function handleSpecialSourceDetail(
  id: string,
  apiSite: ApiSite
): Promise<SearchResult> {
  // 获取特殊源处理器
  const handler = getSpecialSourceHandler(apiSite);

  // 构建详情页URL
  let detailUrl: string;
  if (handler) {
    // 使用处理器配置的URL模板
    detailUrl = `${
      apiSite.detail || apiSite.api
    }${handler.detailUrlTemplate.replace('{id}', id)}`;
  } else {
    // 降级到旧的逻辑
    detailUrl = `${apiSite.detail}/index.php/vod/detail/id/${id}.html`;
  }

  Logger.debug('特殊源解析', `${apiSite.name} - 请求详情: ${detailUrl}`);

  // 使用请求管理器
  const html = await requestManager.fetch<string>(detailUrl, {
    headers: API_CONFIG.detail.headers,
    timeout: 10000,
    retryOptions: {
      maxRetries: 2,
    },
  });

  let matches: string[] = [];

  // 使用处理器配置的正则提取M3U8链接
  if (handler) {
    Logger.debug('特殊源解析', `使用 ${handler.name} 处理器提取M3U8链接`);

    // 尝试使用主正则
    matches = html.match(handler.m3u8Pattern) || [];
    Logger.info(
      '特殊源解析',
      `${handler.name} 主正则匹配到 ${matches.length} 个链接`
    );

    // 如果主正则没匹配到，尝试降级正则
    if (matches.length === 0 && handler.fallbackPattern) {
      matches = html.match(handler.fallbackPattern) || [];
      Logger.info(
        '特殊源解析',
        `${handler.name} 降级正则匹配到 ${matches.length} 个链接`
      );
    }
  } else {
    // 旧的ffzy特定逻辑（向后兼容）
    if (apiSite.key === 'ffzy') {
      const ffzyPattern =
        /\$(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g;
      matches = html.match(ffzyPattern) || [];
      Logger.info('特殊源解析', `ffzy特定正则匹配到 ${matches.length} 个链接`);
    }

    // 通用降级逻辑
    if (matches.length === 0) {
      const generalPattern = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
      matches = html.match(generalPattern) || [];
      Logger.info('特殊源解析', `通用正则匹配到 ${matches.length} 个链接`);
    }
  }

  // 去重并清理链接前缀
  const cleanedMatches = Array.from(new Set(matches)).map((link: string) => {
    link = link.substring(1); // 去掉开头的 $
    const parenIndex = link.indexOf('(');
    return parenIndex > 0 ? link.substring(0, parenIndex) : link;
  });

  // ✅ 过滤无效链接
  const validEpisodes = cleanedMatches.filter((url: string) =>
    isValidM3u8Url(url)
  );

  Logger.success(
    '特殊源解析',
    `${apiSite.name}: 提取到 ${validEpisodes.length} 个有效链接（原始 ${cleanedMatches.length} 个）`
  );

  // ✅ 创建播放源对象
  const playSources: PlaySource[] =
    validEpisodes.length > 0
      ? [
          {
            name: apiSite.name,
            episodes: validEpisodes,
            priority: 1,
          },
        ]
      : [];

  // 提取标题
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const titleText = titleMatch ? titleMatch[1].trim() : '';

  // 提取描述
  const descMatch = html.match(
    /<div[^>]*class=["']sketch["'][^>]*>([\s\S]*?)<\/div>/
  );
  const descText = descMatch ? cleanHtmlTags(descMatch[1]) : '';

  // 提取封面
  const coverMatch = html.match(/(https?:\/\/[^"'\s]+?\.jpg)/g);
  const coverUrl = coverMatch ? coverMatch[0].trim() : '';

  // ✅ 提取年份（使用改进的函数）
  const yearMatch = html.match(/>(\d{4})</);
  const yearText = extractYear(yearMatch ? yearMatch[1] : '');

  Logger.info(
    '特殊源解析-元数据',
    `标题: ${titleText}, 年份: ${yearText}, 封面: ${coverUrl ? '有' : '无'}`
  );

  return {
    id,
    title: titleText,
    poster: coverUrl,

    // ✅ 新增：多播放源支持
    playSources,

    // 保留：主播放源（向后兼容）
    episodes: validEpisodes,

    source: apiSite.key,
    source_name: apiSite.name,
    class: '',
    year: yearText,
    desc: descText,
    type_name: '',
    douban_id: 0,
  };
}

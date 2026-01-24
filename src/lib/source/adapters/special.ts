/**
 * 特殊源适配器
 * 处理需要 HTML 解析的特殊视频源 (ffzy, lzzy, ckzy 等)
 */

import { API_CONFIG } from '@/lib/config';
import { requestManager } from '@/lib/request-manager';
import { ApiSite } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

import {
  BaseSourceAdapter,
  createFallbackPlaySource,
  extractYear,
} from './base';
import { extractM3u8WithPattern } from '../parsers/m3u8';
import {
  SearchResultItem,
  SPECIAL_SOURCES,
  SpecialSourceConfig,
} from '../types';

// ============================================================================
// 常量
// ============================================================================

const DETAIL_TIMEOUT = 10000;

// ============================================================================
// HTML 解析器
// ============================================================================

/**
 * 从 HTML 中提取元数据
 */
function parseHtmlMetadata(html: string): {
  title: string;
  desc: string;
  cover: string;
  year: string;
} {
  // 标题
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 描述
  const descMatch = html.match(
    /<div[^>]*class=["']sketch["'][^>]*>([\s\S]*?)<\/div>/,
  );
  const desc = descMatch ? cleanHtmlTags(descMatch[1]) : '';

  // 封面
  const coverMatch = html.match(/(https?:\/\/[^"'\s]+?\.jpg)/g);
  const cover = coverMatch ? coverMatch[0].trim() : '';

  // 年份
  const yearMatch = html.match(/>(\d{4})</);
  const year = extractYear(yearMatch ? yearMatch[1] : '');

  return { title, desc, cover, year };
}

// ============================================================================
// 适配器实现
// ============================================================================

/**
 * 特殊源适配器
 */
export class SpecialSourceAdapter extends BaseSourceAdapter {
  readonly key = 'special';
  readonly name = '特殊源';

  /**
   * 判断是否支持该源
   * 只有在 SPECIAL_SOURCES 中注册的源才使用此适配器
   * （有 detail 字段不代表是特殊源）
   */
  supports(apiSite: ApiSite): boolean {
    return !!SPECIAL_SOURCES[apiSite.key];
  }

  /**
   * 获取源配置
   */
  private getConfig(apiSite: ApiSite): SpecialSourceConfig | null {
    return SPECIAL_SOURCES[apiSite.key] || null;
  }

  /**
   * 搜索 - 特殊源使用标准 API 搜索
   * 但详情获取使用 HTML 解析
   */
  async search(apiSite: ApiSite, query: string): Promise<SearchResultItem[]> {
    // 特殊源的搜索仍使用标准 API
    // 导入时动态获取避免循环依赖
    const { StandardSourceAdapter } = await import('./standard');
    const standardAdapter = new StandardSourceAdapter();
    return standardAdapter.search(apiSite, query);
  }

  /**
   * 获取详情 - 使用 HTML 解析
   */
  async getDetail(apiSite: ApiSite, id: string): Promise<SearchResultItem> {
    const config = this.getConfig(apiSite);

    // 构建详情页 URL
    const detailUrl = this.buildDetailUrl(apiSite, id, config);

    // 获取 HTML
    const html = await requestManager.fetch<string>(detailUrl, {
      headers: API_CONFIG.detail.headers,
      timeout: DETAIL_TIMEOUT,
      retryOptions: { maxRetries: 2 },
    });

    // 提取 M3U8 链接
    const episodes = this.extractEpisodes(html, config);

    // 提取元数据
    const metadata = parseHtmlMetadata(html);

    // 构建播放源
    const playSources = createFallbackPlaySource(apiSite.name, episodes);
    if (playSources.length > 0) {
      playSources[0].priority = 1; // 特殊源优先级最高
    }

    return {
      id,
      title: metadata.title,
      poster: metadata.cover,
      playSources,
      episodes,
      source: apiSite.key,
      source_name: apiSite.name,
      class: '',
      year: metadata.year,
      desc: metadata.desc,
      type_name: '',
      douban_id: 0,
    };
  }

  /**
   * 构建详情页 URL
   */
  private buildDetailUrl(
    apiSite: ApiSite,
    id: string,
    config: SpecialSourceConfig | null,
  ): string {
    if (config) {
      const base = apiSite.detail || apiSite.api;
      return `${base}${config.detailUrlTemplate.replace('{id}', id)}`;
    }

    // 降级：默认模板
    return `${apiSite.detail}/index.php/vod/detail/id/${id}.html`;
  }

  /**
   * 提取剧集链接
   */
  private extractEpisodes(
    html: string,
    config: SpecialSourceConfig | null,
  ): string[] {
    if (config) {
      return extractM3u8WithPattern(
        html,
        config.m3u8Pattern,
        config.fallbackPattern,
      );
    }

    // 降级：通用正则
    const pattern = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
    return extractM3u8WithPattern(html, pattern);
  }
}

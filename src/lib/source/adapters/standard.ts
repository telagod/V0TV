/**
 * 标准 API 源适配器
 * 处理遵循标准 API 格式的视频源
 */

import { API_CONFIG, getConfig } from '@/lib/config';
import { requestManager } from '@/lib/request-manager';
import { ApiSite } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

import {
  BaseSourceAdapter,
  createFallbackPlaySource,
  extractYear,
  mapToSearchResult,
} from './base';
import {
  extractM3u8Fallback,
  extractPlaySources,
} from '../parsers/m3u8';
import {
  ApiSearchResponse,
  SearchResultItem,
  SPECIAL_SOURCES,
} from '../types';

// ============================================================================
// 常量
// ============================================================================

const SEARCH_TIMEOUT = 8000;
const DETAIL_TIMEOUT = 10000;

// ============================================================================
// 适配器实现
// ============================================================================

/**
 * 标准 API 源适配器
 */
export class StandardSourceAdapter extends BaseSourceAdapter {
  readonly key = 'standard';
  readonly name = '标准API源';

  /**
   * 判断是否支持该源
   * 标准源：只要不是特殊源，就使用标准适配器
   */
  supports(apiSite: ApiSite): boolean {
    return !SPECIAL_SOURCES[apiSite.key];
  }

  /**
   * 搜索
   */
  async search(apiSite: ApiSite, query: string): Promise<SearchResultItem[]> {
    const apiUrl =
      apiSite.api + API_CONFIG.search.path + encodeURIComponent(query);

    const data = await requestManager.fetch<ApiSearchResponse>(apiUrl, {
      headers: API_CONFIG.search.headers,
      timeout: SEARCH_TIMEOUT,
      retryOptions: { maxRetries: 2 },
    });

    if (!data?.list?.length) {
      return [];
    }

    // 映射第一页结果
    const results = data.list.map((item) => mapToSearchResult(item, apiSite));

    // 获取分页结果
    const additionalResults = await this.fetchAdditionalPages(
      apiSite,
      query,
      data.pagecount || 1,
    );

    return [...results, ...additionalResults];
  }

  /**
   * 获取详情
   */
  async getDetail(apiSite: ApiSite, id: string): Promise<SearchResultItem> {
    const detailUrl = `${apiSite.api}${API_CONFIG.detail.path}${id}`;

    const data = await requestManager.fetch<ApiSearchResponse>(detailUrl, {
      headers: API_CONFIG.detail.headers,
      timeout: DETAIL_TIMEOUT,
      retryOptions: { maxRetries: 3 },
    });

    if (!data?.list?.length) {
      throw new Error('获取到的详情内容无效');
    }

    const item = data.list[0];

    // 提取播放源
    let playSources = extractPlaySources(
      item.vod_play_url || '',
      item.vod_play_from,
      true, // 验证链接
    );

    // 降级：从内容中提取
    if (playSources.length === 0 && item.vod_content) {
      const fallbackEpisodes = extractM3u8Fallback(item.vod_content);
      playSources = createFallbackPlaySource('内容提取', fallbackEpisodes);
    }

    const episodes = playSources[0]?.episodes || [];

    return {
      id: id.toString(),
      title: item.vod_name,
      poster: item.vod_pic,
      playSources,
      episodes,
      source: apiSite.key,
      source_name: apiSite.name,
      class: item.vod_class,
      year: extractYear(item.vod_year),
      desc: cleanHtmlTags(item.vod_content || ''),
      type_name: item.type_name,
      douban_id: item.vod_douban_id,
    };
  }

  /**
   * 获取额外分页
   */
  private async fetchAdditionalPages(
    apiSite: ApiSite,
    query: string,
    totalPages: number,
  ): Promise<SearchResultItem[]> {
    const config = await getConfig();
    const maxPages = config.SiteConfig.SearchDownstreamMaxPage;
    const pagesToFetch = Math.min(totalPages - 1, maxPages - 1);

    if (pagesToFetch <= 0) {
      return [];
    }

    const promises = [];

    for (let page = 2; page <= pagesToFetch + 1; page++) {
      const pageUrl =
        apiSite.api +
        API_CONFIG.search.pagePath
          .replace('{query}', encodeURIComponent(query))
          .replace('{page}', page.toString());

      promises.push(this.fetchPage(pageUrl, apiSite));
    }

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * 获取单页
   */
  private async fetchPage(
    url: string,
    apiSite: ApiSite,
  ): Promise<SearchResultItem[]> {
    try {
      const data = await requestManager.fetch<ApiSearchResponse>(url, {
        headers: API_CONFIG.search.headers,
        timeout: SEARCH_TIMEOUT,
        retryOptions: { maxRetries: 1 },
      });

      if (!data?.list?.length) {
        return [];
      }

      return data.list.map((item) => mapToSearchResult(item, apiSite));
    } catch {
      return [];
    }
  }
}

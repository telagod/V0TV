/**
 * 源适配器基类
 * 提供通用功能和模板方法
 */

import { ApiSite } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

import { extractPlaySources } from '../parsers/m3u8';
import { ISourceAdapter, PlaySource, SearchResultItem } from '../types';

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从年份字符串中提取有效年份
 */
export function extractYear(vodYear: string | null | undefined): string {
  if (!vodYear) return '';

  const years = vodYear.match(/\d{4}/g);
  if (!years || years.length === 0) return '';

  const currentYear = new Date().getFullYear();
  const validYears = years
    .map((y) => parseInt(y))
    .filter((y) => y >= 1900 && y <= currentYear + 1);

  if (validYears.length === 0) return '';

  return Math.max(...validYears).toString();
}

/**
 * 将 API 搜索项映射为搜索结果
 */
export function mapToSearchResult(
  item: {
    vod_id: string;
    vod_name: string;
    vod_pic: string;
    vod_play_url?: string;
    vod_play_from?: string;
    vod_class?: string;
    vod_year?: string;
    vod_content?: string;
    vod_douban_id?: number;
    type_name?: string;
  },
  apiSite: ApiSite,
): SearchResultItem {
  const playSources = extractPlaySources(
    item.vod_play_url || '',
    item.vod_play_from,
  );

  const episodes = playSources[0]?.episodes || [];

  return {
    id: item.vod_id.toString(),
    title: item.vod_name.trim().replace(/\s+/g, ' '),
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
 * 创建空结果的播放源
 */
export function createFallbackPlaySource(
  name: string,
  episodes: string[],
): PlaySource[] {
  if (episodes.length === 0) return [];

  return [
    {
      name,
      episodes,
      priority: 99,
    },
  ];
}

// ============================================================================
// 基类
// ============================================================================

/**
 * 源适配器抽象基类
 */
export abstract class BaseSourceAdapter implements ISourceAdapter {
  abstract readonly key: string;
  abstract readonly name: string;

  abstract supports(apiSite: ApiSite): boolean;
  abstract search(apiSite: ApiSite, query: string): Promise<SearchResultItem[]>;
  abstract getDetail(apiSite: ApiSite, id: string): Promise<SearchResultItem>;
}

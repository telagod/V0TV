/**
 * 源模块类型定义
 * 统一的类型系统，便于扩展和维护
 */

import { ApiSite } from '@/lib/types';

// ============================================================================
// 核心数据结构
// ============================================================================

/**
 * 播放源
 */
export interface PlaySource {
  name: string;
  episodes: string[];
  priority: number;
  quality?: string;
}

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  id: string;
  title: string;
  poster: string;
  playSources: PlaySource[];
  episodes: string[]; // 向后兼容
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
}

/**
 * API 搜索响应项
 */
export interface ApiSearchItem {
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

/**
 * API 搜索响应
 */
export interface ApiSearchResponse {
  list?: ApiSearchItem[];
  pagecount?: number;
}

// ============================================================================
// 适配器接口
// ============================================================================

/**
 * 源适配器接口 - 所有源适配器必须实现
 */
export interface ISourceAdapter {
  /** 源标识 */
  readonly key: string;

  /** 源名称 */
  readonly name: string;

  /** 是否支持该源 */
  supports(apiSite: ApiSite): boolean;

  /** 搜索 */
  search(apiSite: ApiSite, query: string): Promise<SearchResultItem[]>;

  /** 获取详情 */
  getDetail(apiSite: ApiSite, id: string): Promise<SearchResultItem>;
}

/**
 * 特殊源处理器配置
 */
export interface SpecialSourceConfig {
  key: string;
  name: string;
  detailUrlTemplate: string;
  m3u8Pattern: RegExp;
  fallbackPattern?: RegExp;
}

// ============================================================================
// 解析器接口
// ============================================================================

/**
 * M3U8 解析结果
 */
export interface M3u8ParseResult {
  sources: PlaySource[];
  rawLinks: string[];
}

/**
 * 优先级配置
 */
export interface PriorityConfig {
  keywords: string[];
  priority: number;
}

// ============================================================================
// 常量
// ============================================================================

/**
 * 优先级规则 (数字越小优先级越高)
 */
export const PRIORITY_RULES: PriorityConfig[] = [
  { keywords: ['m3u8'], priority: 1 },
  { keywords: ['高清', 'hd', '1080', '4k', '蓝光'], priority: 2 },
  { keywords: ['标清', 'sd', '720'], priority: 3 },
  { keywords: ['量子', '非凡', 'ffzy', 'lzzy'], priority: 4 },
];

/**
 * 特殊源配置表
 */
export const SPECIAL_SOURCES: Record<string, SpecialSourceConfig> = {
  ffzy: {
    key: 'ffzy',
    name: '非凡资源',
    detailUrlTemplate: '/index.php/vod/detail/id/{id}.html',
    m3u8Pattern: /\$(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g,
    fallbackPattern: /\$(https?:\/\/[^"'\s]+?\.m3u8)/g,
  },
  lzzy: {
    key: 'lzzy',
    name: '量子资源',
    detailUrlTemplate: '/index.php/vod/detail/id/{id}.html',
    m3u8Pattern: /\$(https?:\/\/[^"'\s]+?\/\d{8}\/[^"'\s]+?\.m3u8)/g,
    fallbackPattern: /\$(https?:\/\/[^"'\s]+?\.m3u8)/g,
  },
  ckzy: {
    key: 'ckzy',
    name: '采集资源',
    detailUrlTemplate: '/index.php/vod/detail/id/{id}.html',
    m3u8Pattern: /\$(https?:\/\/[^"'\s]+?\/\d{8}\/[^"'\s]+?\.m3u8)/g,
    fallbackPattern: /\$(https?:\/\/[^"'\s]+?\.m3u8)/g,
  },
};

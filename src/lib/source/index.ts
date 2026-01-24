/**
 * 源模块统一导出
 */

// 类型
export type {
  ApiSearchItem,
  ApiSearchResponse,
  ISourceAdapter,
  M3u8ParseResult,
  PlaySource,
  PriorityConfig,
  SearchResultItem,
  SpecialSourceConfig,
} from './types';
export { PRIORITY_RULES, SPECIAL_SOURCES } from './types';

// 解析器
export {
  calculatePriority,
  cleanM3u8Link,
  extractM3u8Fallback,
  extractM3u8WithPattern,
  extractPlaySources,
  isValidM3u8Url,
} from './parsers/m3u8';

// 适配器
export { BaseSourceAdapter, extractYear, mapToSearchResult } from './adapters/base';
export { SpecialSourceAdapter } from './adapters/special';
export { StandardSourceAdapter } from './adapters/standard';

// 管理器
export { getDetailFromApi,searchFromApi, sourceManager } from './manager';

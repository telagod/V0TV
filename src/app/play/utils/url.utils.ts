/**
 * URL处理相关工具函数
 */

import { VideoData } from '../types/player.types';

/**
 * 同步URL参数
 * 将视频信息同步到URL，不刷新页面
 */
export function syncUrlParams(
  data: Pick<
    VideoData,
    'currentSource' | 'currentId' | 'videoYear' | 'videoTitle'
  >,
  episodeIndex: number,
  searchTitle?: string,
  searchType?: string,
): void {
  if (typeof window === 'undefined') return;

  const newUrl = new URL(window.location.href);

  // 基本信息
  newUrl.searchParams.set('source', data.currentSource);
  newUrl.searchParams.set('id', data.currentId);
  newUrl.searchParams.set('year', data.videoYear);
  newUrl.searchParams.set('title', data.videoTitle);

  // 集数信息
  if (episodeIndex > 0) {
    newUrl.searchParams.set('ep', String(episodeIndex + 1));
  } else {
    newUrl.searchParams.delete('ep');
  }

  // 保留搜索信息（用于换源）
  if (searchTitle) {
    newUrl.searchParams.set('stitle', searchTitle);
  }
  if (searchType) {
    newUrl.searchParams.set('stype', searchType);
  }

  // 删除一次性参数
  newUrl.searchParams.delete('prefer');

  window.history.replaceState({}, '', newUrl.toString());
}

/**
 * 从URL参数获取初始数据
 */
export function getInitialDataFromUrl(searchParams: URLSearchParams) {
  return {
    source: searchParams.get('source') || '',
    id: searchParams.get('id') || '',
    title: searchParams.get('title') || '',
    year: searchParams.get('year') || '',
    searchTitle: searchParams.get('stitle') || '',
    searchType: searchParams.get('stype') || '',
    needPrefer: searchParams.get('prefer') === 'true',
    initialEpisode: parseInt(searchParams.get('ep') || '1', 10) - 1,
  };
}

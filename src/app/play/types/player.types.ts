/**
 * 播放器相关类型定义
 */

import Artplayer from 'artplayer';
import Hls from 'hls.js';

import { SearchResult } from '@/lib/types';

// ============================================================================
// 播放器类型
// ============================================================================

/**
 * Artplayer 实例类型
 */
export type ArtPlayerInstance = Artplayer;

/**
 * HLS 错误数据类型
 */
export interface HlsErrorData {
  type: string;
  details: string;
  fatal: boolean;
  url?: string;
  response?: {
    code: number;
    text: string;
  };
  reason?: string;
  level?: string;
  parent?: string;
  buffer?: number;
  error?: Error;
}

/**
 * HLS 片段加载数据类型
 */
export interface HlsFragLoadedData {
  frag: {
    url: string;
    duration: number;
    level: number;
    sn: number;
    start: number;
    cc: number;
  };
  payload: ArrayBuffer;
  networkDetails?: unknown;
}

/**
 * 扩展 HTMLVideoElement 类型以支持 hls 属性
 */
declare global {
  interface HTMLVideoElement {
    hls?: Hls;
  }
}

/**
 * 播放器配置
 */
export interface VideoPlayerConfig {
  url: string;
  poster: string;
  title: string;
  autoplay?: boolean;
  volume?: number;
  blockAdEnabled?: boolean;
}

/**
 * 播放状态
 */
export interface PlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
}

// ============================================================================
// 视频数据类型
// ============================================================================

/**
 * 视频数据
 */
export interface VideoData {
  detail: SearchResult | null;
  currentSource: string;
  currentId: string;
  currentEpisodeIndex: number;
  videoTitle: string;
  videoYear: string;
  videoCover: string;
  totalEpisodes: number;
}

/**
 * 加载阶段
 */
export type LoadingStage =
  | 'searching' // 搜索播放源
  | 'preferring' // 优选播放源
  | 'fetching' // 获取详情
  | 'ready' // 准备就绪
  | 'sourceChanging'; // 换源中

/**
 * 加载状态
 */
export interface LoadingState {
  loading: boolean;
  stage: LoadingStage;
  message: string;
}

// ============================================================================
// 播放记录类型
// ============================================================================

/**
 * 播放记录
 */
export interface PlayRecord {
  source: string;
  id: string;
  episodeIndex: number;
  currentTime: number;
  duration: number;
  title: string;
  cover: string;
  updatedAt: number;
}

// ============================================================================
// 源选择类型
// ============================================================================

/**
 * 源搜索状态
 */
export interface SourceSearchState {
  sources: SearchResult[];
  loading: boolean;
  error: string | null;
}

/**
 * 换源选项
 */
export interface SwitchSourceOptions {
  newSource: string;
  newId: string;
  newTitle: string;
  preserveProgress?: boolean;
}

// ============================================================================
// 键盘快捷键类型
// ============================================================================

/**
 * 键盘快捷键配置
 */
export interface KeyboardShortcut {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
  preventDefault?: boolean;
}

// ============================================================================
// Hook 返回类型
// ============================================================================

/**
 * useVideoPlayer Hook 返回类型
 */
export interface UseVideoPlayerReturn {
  player: ArtPlayerInstance | null;
  isReady: boolean;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  destroy: () => void;
}

/**
 * usePlaybackHistory Hook 返回类型
 */
export interface UsePlaybackHistoryReturn {
  resumeTime: number | null;
  saveProgress: (currentTime: number, duration: number) => Promise<void>;
  deleteRecord: () => Promise<void>;
}

/**
 * useSourceSelection Hook 返回类型
 */
export interface UseSourceSelectionReturn {
  sources: SearchResult[];
  loading: boolean;
  error: string | null;
  searchSources: () => Promise<void>;
  switchSource: (options: SwitchSourceOptions) => Promise<void>;
}

/**
 * useFavorite Hook 返回类型
 */
export interface UseFavoriteReturn {
  favorited: boolean;
  loading: boolean;
  toggleFavorite: () => Promise<void>;
}

/**
 * useVideoData Hook 返回类型
 */
export interface UseVideoDataReturn {
  data: VideoData;
  loading: boolean;
  error: string | null;
  updateEpisodeIndex: (index: number) => void;
  updateSource: (source: string, id: string) => void;
}

/**
 * VideoPlayer 组件
 * 视频播放器容器组件
 */

'use client';

import { useEffect, useRef } from 'react';

import { logInfo } from '@/lib/logger';

import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import type { ArtPlayerInstance } from '../../types/player.types';

interface VideoPlayerProps {
  /** 视频URL */
  url: string;
  /** 海报图片 */
  poster: string;
  /** 视频标题 */
  title: string;
  /** 是否启用广告过滤 */
  blockAdEnabled: boolean;
  /** 是否加载中 */
  loading: boolean;
  /** 恢复播放时间 */
  resumeTime?: number | null;
  /** 播放器准备就绪回调 */
  onReady?: () => void;
  /** 播放器实例创建回调 */
  onPlayerCreated?: (player: ArtPlayerInstance) => void;
  /** 时间更新回调 */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** 播放结束回调 */
  onEnded?: () => void;
  /** 暂停回调 */
  onPause?: () => void;
  /** 错误回调 */
  onError?: (error: Error | string) => void;
  /** 音量变化回调 */
  onVolumeChange?: (volume: number) => void;
  /** 下一集按钮点击回调 */
  onNextEpisode?: () => void;
  /** 容器className */
  className?: string;
}

/**
 * 视频播放器组件
 */
export function VideoPlayer(props: VideoPlayerProps) {
  const {
    url,
    poster,
    title,
    blockAdEnabled,
    loading,
    resumeTime,
    onReady,
    onPlayerCreated,
    onTimeUpdate,
    onEnded,
    onPause,
    onError,
    onVolumeChange,
    onNextEpisode,
    className = '',
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const { player, seek } = useVideoPlayer({
    url,
    poster,
    title,
    containerRef,
    blockAdEnabled,
    loading,
    onReady,
    onTimeUpdate,
    onEnded,
    onPause,
    onError,
    onVolumeChange,
    onNextEpisode,
  });

  // 通知父组件player实例已创建
  useEffect(() => {
    if (player && onPlayerCreated) {
      onPlayerCreated(player);
    }
  }, [player, onPlayerCreated]);

  // 恢复播放进度
  useEffect(() => {
    if (player && resumeTime && resumeTime > 0) {
      // 延迟恢复，等待播放器准备就绪
      const timer = setTimeout(() => {
        seek(resumeTime);
        logInfo('恢复播放进度到', resumeTime);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [player, resumeTime, seek]);

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-video bg-black rounded-lg overflow-hidden ${className}`}
      style={{ maxHeight: '80vh' }}
    />
  );
}

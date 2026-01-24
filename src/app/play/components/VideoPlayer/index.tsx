/**
 * VideoPlayer 组件
 * 视频播放器容器组件
 */

'use client';

import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logInfo } from '@/lib/logger';
import { recordUrlHealth } from '@/lib/source-health';
import { processImageUrl } from '@/lib/utils';

import { CustomHlsJsLoader } from './AdFilterLoader';
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
  const nativeVideoRef = useRef<HTMLVideoElement>(null);

  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [localResumeTime, setLocalResumeTime] = useState<number | null>(null);

  const handlePlayerError = useCallback(
    (error: Error | string) => {
      const message = error instanceof Error ? error.message : String(error);
      setPlayerError(message || '播放器加载失败');
      onError?.(error);
    },
    [onError],
  );

  const handleReady = useCallback(() => {
    setPlayerError(null);
    onReady?.();
  }, [onReady]);

  const { player, seek, destroy, isReady } = useVideoPlayer({
    enabled: !fallbackEnabled,
    url,
    poster,
    title,
    containerRef,
    blockAdEnabled,
    loading,
    onReady: handleReady,
    onTimeUpdate,
    onEnded,
    onPause,
    onError: handlePlayerError,
    onVolumeChange,
    onNextEpisode,
  });

  // 通知父组件player实例已创建
  useEffect(() => {
    if (player && onPlayerCreated) {
      onPlayerCreated(player);
    }
  }, [player, onPlayerCreated]);

  // URL 或降级状态变化时清理错误提示
  useEffect(() => {
    setPlayerError(null);
  }, [url, fallbackEnabled]);

  // 恢复播放进度
  useEffect(() => {
    const targetTime = (localResumeTime ?? resumeTime) ?? null;
    if (player && targetTime && targetTime > 0) {
      // 延迟恢复，等待播放器准备就绪
      const timer = setTimeout(() => {
        seek(targetTime);
        logInfo('恢复播放进度到', targetTime);
        if (localResumeTime) setLocalResumeTime(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [player, resumeTime, localResumeTime, seek]);

  // 原生播放器模式：最小依赖 + 保底 controls（适配 Artplayer/CSS/初始化失败场景）
  useEffect(() => {
    if (!fallbackEnabled) return;
    const video = nativeVideoRef.current;
    if (!video || !url || loading) return;

    const isM3u8 = /\.m3u8(\?|$)/i.test(url);
    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl');
    const targetTime = (localResumeTime ?? resumeTime) ?? null;

    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    // 不要设置 crossOrigin=anonymous：会强制 CORS，导致大量源站/图床直接失败
    if (poster) video.poster = processImageUrl(poster);

    const handleNativeError = () => {
      setPlayerError(
        '视频加载失败：可能是源站不可达或不支持跨域播放（可尝试换源/换集）',
      );
      recordUrlHealth(url, false, { weight: 1 });
    };

    const handleNativeCanPlay = () => {
      setPlayerError(null);
      if (targetTime && targetTime > 0) {
        try {
          video.currentTime = targetTime;
          if (localResumeTime) setLocalResumeTime(null);
        } catch {
          // ignore
        }
      }
    };

    const handleNativePlaying = () => {
      recordUrlHealth(url, true, { weight: 0.6 });
    };

    video.addEventListener('error', handleNativeError);
    video.addEventListener('canplay', handleNativeCanPlay);
    video.addEventListener('playing', handleNativePlaying);

    // 清理旧的 Hls 实例
    if ((video as HTMLVideoElement & { hls?: Hls }).hls) {
      (video as HTMLVideoElement & { hls?: Hls }).hls?.destroy();
      (video as HTMLVideoElement & { hls?: Hls }).hls = undefined;
    }

    // Safari 等支持原生 HLS：直接设置 src；否则用 hls.js
    if (isM3u8 && Hls.isSupported() && !canPlayNativeHls) {
      const hls = new Hls({
        debug: false,
        enableWorker: false,
        lowLatencyMode: true,
        maxBufferLength: 30,
        backBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        loader: (blockAdEnabled
          ? CustomHlsJsLoader
          : Hls.DefaultConfig.loader) as unknown as typeof Hls.DefaultConfig.loader,
      });

      hls.loadSource(url);
      hls.attachMedia(video);
      (video as HTMLVideoElement & { hls?: Hls }).hls = hls;
    } else {
      video.src = url;
    }

    return () => {
      video.removeEventListener('error', handleNativeError);
      video.removeEventListener('canplay', handleNativeCanPlay);
      video.removeEventListener('playing', handleNativePlaying);
      if ((video as HTMLVideoElement & { hls?: Hls }).hls) {
        (video as HTMLVideoElement & { hls?: Hls }).hls?.destroy();
        (video as HTMLVideoElement & { hls?: Hls }).hls = undefined;
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [
    fallbackEnabled,
    url,
    loading,
    poster,
    blockAdEnabled,
    resumeTime,
    localResumeTime,
  ]);

  return (
    <div
      className={`relative w-full aspect-video lg:aspect-auto lg:h-full bg-black rounded-lg overflow-hidden ${className}`}
      style={{ maxHeight: '80vh' }}
    >
      {!!url && !loading && (
        <div className='absolute top-2 right-2 z-20 flex items-center gap-2'>
          <button
            type='button'
            onClick={() => {
              setPlayerError(null);
              if (fallbackEnabled) {
                const currentTime = nativeVideoRef.current?.currentTime ?? 0;
                if (currentTime > 0) setLocalResumeTime(currentTime);
                setFallbackEnabled(false);
              } else {
                const currentTime = player?.currentTime ?? 0;
                if (currentTime > 0) setLocalResumeTime(currentTime);
                setFallbackEnabled(true);
                destroy();
              }
            }}
            className='px-2 py-1 rounded-md bg-black/40 hover:bg-black/55 text-white/90 text-xs border border-white/15 backdrop-blur transition-colors'
            aria-label={fallbackEnabled ? '切换到增强播放器' : '切换到原生播放器'}
          >
            {fallbackEnabled ? '增强' : '原生'}
          </button>
        </div>
      )}

      {/* Artplayer 容器 */}
      <div
        ref={containerRef}
        className={!fallbackEnabled ? 'absolute inset-0' : 'hidden'}
      />

      {/* 原生播放器：永远有 controls 的保底方案 */}
      <video
        ref={nativeVideoRef}
        className={
          fallbackEnabled
            ? 'absolute inset-0 w-full h-full object-contain'
            : 'hidden'
        }
      />

      {/* 无播放地址/加载中占位 */}
      {(!url || loading) && (
        <div className='absolute inset-0 flex items-center justify-center text-white/80'>
          <div className='text-center px-4'>
            <div className='text-sm font-medium'>
              {loading ? '加载中…' : '暂无可播放地址'}
            </div>
            <div className='mt-1 text-xs text-white/60'>
              {loading ? '正在拉取播放信息' : '尝试换源或换集'}
            </div>
          </div>
        </div>
      )}

      {/* 初始化提示：不阻塞点击/手势，避免影响观看 */}
      {!!url && !loading && !fallbackEnabled && !isReady && !playerError && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='flex items-center gap-2 rounded-md bg-black/30 px-3 py-2 text-xs text-white/80 backdrop-blur'>
            <div className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent' />
            <span>加载播放器…</span>
          </div>
        </div>
      )}

      {/* 错误提示（生产环境也可见） */}
      {playerError && (
        <div className='absolute inset-0 flex items-center justify-center bg-black/40 text-white'>
          <div className='max-w-[90%] text-center px-4'>
            <div className='text-sm font-semibold'>播放失败</div>
            <div className='mt-1 text-xs text-white/80 break-words'>
              {playerError}
            </div>
            {!fallbackEnabled && (
              <div className='mt-3'>
                <button
                  type='button'
                  onClick={() => {
                    setFallbackEnabled(true);
                    destroy();
                  }}
                  className='px-3 py-1.5 text-xs rounded-md bg-white/10 hover:bg-white/15 border border-white/15 transition-colors'
                >
                  使用原生播放器重试
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

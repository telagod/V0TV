/**
 * useVideoPlayer Hook
 * 管理Artplayer实例的生命周期、事件监听和HLS配置
 */

import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logError, logInfo } from '@/lib/logger';

import { CustomHlsJsLoader } from '../components/VideoPlayer/AdFilterLoader';
import type {
  ArtPlayerInstance,
  UseVideoPlayerReturn,
} from '../types/player.types';
import { ensureVideoSource, isSafariBrowser } from '../utils/player.utils';

interface UseVideoPlayerOptions {
  /** 视频URL */
  url: string;
  /** 海报图片 */
  poster: string;
  /** 视频标题 */
  title: string;
  /** 容器ref */
  containerRef: React.RefObject<HTMLDivElement>;
  /** 是否启用广告过滤 */
  blockAdEnabled: boolean;
  /** 是否加载中 */
  loading: boolean;
  /** 播放器准备就绪回调 */
  onReady?: () => void;
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
}

/**
 * 播放器核心Hook
 */
export function useVideoPlayer(
  options: UseVideoPlayerOptions
): UseVideoPlayerReturn {
  const {
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
  } = options;

  const playerRef = useRef<ArtPlayerInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const blockAdRef = useRef(blockAdEnabled);

  // 同步blockAdEnabled到ref（避免作为依赖项）
  useEffect(() => {
    blockAdRef.current = blockAdEnabled;
  }, [blockAdEnabled]);

  // 创建/更新播放器
  useEffect(() => {
    if (!Artplayer || !Hls || !url || loading || !containerRef.current) {
      return;
    }

    // Safari浏览器检测
    const isSafari = isSafariBrowser();

    // 非Safari且播放器已存在，使用switch方法切换URL
    if (!isSafari && playerRef.current) {
      playerRef.current.switch = url;
      playerRef.current.title = title;
      playerRef.current.poster = poster;
      if (playerRef.current?.video) {
        ensureVideoSource(playerRef.current.video as HTMLVideoElement, url);
      }
      return;
    }

    // Safari或首次创建：销毁之前的播放器并创建新的
    if (playerRef.current) {
      if (playerRef.current.video?.hls) {
        playerRef.current.video.hls.destroy();
      }
      playerRef.current.destroy();
      playerRef.current = null;
    }

    try {
      // 配置播放速率
      Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
      Artplayer.USE_RAF = true;

      // 创建播放器实例
      const art = new Artplayer({
        container: containerRef.current,
        url,
        poster,
        volume: 0.7,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: false,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: false,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: false,
        mutex: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        theme: '#22c55e',
        lang: 'zh-cn',
        hotkey: false,
        fastForward: true,
        autoOrientation: true,
        lock: true,
        moreVideoAttr: {
          crossOrigin: 'anonymous',
        },
        // HLS 支持配置
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (!Hls) {
              logError('HLS.js 未加载');
              return;
            }

            if (video.hls) {
              video.hls.destroy();
            }

            const hls = new Hls({
              debug: false,
              enableWorker: true,
              lowLatencyMode: true,
              maxBufferLength: 30,
              backBufferLength: 30,
              maxBufferSize: 60 * 1000 * 1000,
              loader: blockAdRef.current
                ? CustomHlsJsLoader
                : Hls.DefaultConfig.loader,
            });

            hls.loadSource(url);
            hls.attachMedia(video);
            video.hls = hls;

            ensureVideoSource(video, url);

            hls.on(
              Hls.Events.ERROR,
              function (
                _event: string,
                data: { fatal?: boolean; type?: string; details?: string }
              ) {
                logError('HLS Error', _event, data);
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      logInfo('网络错误，尝试恢复...');
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      logInfo('媒体错误，尝试恢复...');
                      hls.recoverMediaError();
                      break;
                    default:
                      logInfo('无法恢复的错误');
                      hls.destroy();
                      break;
                  }
                }
              }
            );
          },
        },
        icons: {
          loading:
            '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cGF0aCBkPSJNMjUuMjUxIDYuNDYxYy0xMC4zMTggMC0xOC42ODMgOC4zNjUtMTguNjgzIDE4LjY4M2g0LjA2OGMwLTguMDcgNi41NDUtMTQuNjE1IDE0LjYxNS0xNC42MTVWNi40NjF6IiBmaWxsPSIjMDA5Njg4Ij48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIGF0dHJpYnV0ZVR5cGU9IlhNTCIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHRvPSIzNjAgMjUgMjUiIHR5cGU9InJvdGF0ZSIvPjwvcGF0aD48L3N2Zz4=">',
        },
        settings: [
          {
            html: '去广告',
            icon: '<text x="50%" y="50%" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">AD</text>',
            tooltip: blockAdEnabled ? '已开启' : '已关闭',
            onClick() {
              // 广告开关由外部组件控制
              return blockAdRef.current ? '当前开启' : '当前关闭';
            },
          },
        ],
        controls: onNextEpisode
          ? [
              {
                position: 'left',
                index: 13,
                html: '<i class="art-icon flex"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
                tooltip: '播放下一集',
                click: function () {
                  onNextEpisode?.();
                },
              },
            ]
          : [],
      });

      playerRef.current = art;
      setIsReady(false);

      // 定义事件处理器
      const handleReady = () => {
        setIsReady(true);
        onReady?.();
      };

      const handleVolumeChange = () => {
        onVolumeChange?.(art.volume);
      };

      const handleTimeUpdate = () => {
        const currentTime = art.currentTime || 0;
        const duration = art.duration || 0;
        onTimeUpdate?.(currentTime, duration);
      };

      const handleCanPlay = () => {
        // 视频可播放时触发
      };

      const handleError = (err: Error | string) => {
        logError('播放器错误', err);
        onError?.(err);
      };

      const handleEnded = () => {
        onEnded?.();
      };

      const handlePause = () => {
        onPause?.();
      };

      // 注册事件监听器
      art.on('ready', handleReady);
      art.on('video:volumechange', handleVolumeChange);
      art.on('video:timeupdate', handleTimeUpdate);
      art.on('video:canplay', handleCanPlay);
      art.on('error', handleError);
      art.on('video:ended', handleEnded);
      art.on('pause', handlePause);

      if (art?.video) {
        ensureVideoSource(art.video as HTMLVideoElement, url);
      }

      // 清理函数
      return () => {
        if (art && !art.isDestroy) {
          // 移除所有事件监听器
          art.off('ready', handleReady);
          art.off('video:volumechange', handleVolumeChange);
          art.off('video:timeupdate', handleTimeUpdate);
          art.off('video:canplay', handleCanPlay);
          art.off('error', handleError);
          art.off('video:ended', handleEnded);
          art.off('pause', handlePause);

          // 清理 HLS 实例
          if (art.video?.hls) {
            art.video.hls.destroy();
          }

          // 销毁播放器
          art.destroy();
        }
      };
    } catch (err) {
      logError('创建播放器失败', err);
      onError?.(err instanceof Error ? err : String(err));
    }
  }, [
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
  ]);

  // 播放控制方法
  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
    }
  }, []);

  const destroy = useCallback(() => {
    if (playerRef.current) {
      if (playerRef.current.video?.hls) {
        playerRef.current.video.hls.destroy();
      }
      playerRef.current.destroy();
      playerRef.current = null;
      setIsReady(false);
    }
  }, []);

  return {
    player: playerRef.current,
    isReady,
    play,
    pause,
    seek,
    destroy,
  };
}

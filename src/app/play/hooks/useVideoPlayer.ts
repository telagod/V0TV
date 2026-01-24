/**
 * useVideoPlayer Hook
 * 管理Artplayer实例的生命周期、事件监听和HLS配置
 */

import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logError, logInfo } from '@/lib/logger';
import { recordUrlHealth } from '@/lib/source-health';

import { CustomHlsJsLoader } from '../components/VideoPlayer/AdFilterLoader';
import type {
  ArtPlayerInstance,
  UseVideoPlayerReturn,
} from '../types/player.types';
import { ensureVideoSource } from '../utils/player.utils';

interface UseVideoPlayerOptions {
  /** 是否启用播放器（用于切换原生播放器/占位等场景） */
  enabled?: boolean;
  /** 视频URL */
  url: string;
  /** 海报图片 */
  poster: string;
  /** 视频标题 */
  title: string;
  /** 容器ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
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
  options: UseVideoPlayerOptions,
): UseVideoPlayerReturn {
  const {
    enabled = true,
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
  const [player, setPlayer] = useState<ArtPlayerInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [reinitKey, setReinitKey] = useState(0);
  const blockAdRef = useRef(blockAdEnabled);
  const lastUrlRef = useRef<string>('');
  const callbacksRef = useRef({
    onReady,
    onTimeUpdate,
    onEnded,
    onPause,
    onError,
    onVolumeChange,
    onNextEpisode,
  });

  // 同步blockAdEnabled到ref（避免作为依赖项）
  useEffect(() => {
    blockAdRef.current = blockAdEnabled;
  }, [blockAdEnabled]);

  // 同步回调到ref（避免因回调变更触发播放器重建）
  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onTimeUpdate,
      onEnded,
      onPause,
      onError,
      onVolumeChange,
      onNextEpisode,
    };
  }, [onReady, onTimeUpdate, onEnded, onPause, onError, onVolumeChange, onNextEpisode]);

  const destroy = useCallback(() => {
    if (playerRef.current) {
      if (playerRef.current.video?.hls) {
        playerRef.current.video.hls.destroy();
      }
      playerRef.current.destroy();
      playerRef.current = null;
      setPlayer(null);
      setIsReady(false);
    }
  }, []);

  // 卸载时销毁播放器
  useEffect(() => {
    return () => destroy();
  }, [destroy]);

  // 禁用时销毁播放器
  useEffect(() => {
    if (!enabled) destroy();
  }, [enabled, destroy]);

  // 初始化播放器：仅当不存在实例且满足条件时创建（不返回清理函数，避免依赖变化导致闪屏）
  useEffect(() => {
    if (!enabled || loading || !url || !containerRef.current) return;
    if (playerRef.current) return;

    try {
      // 配置播放速率
      Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
      Artplayer.USE_RAF = true;

      const isM3u8 = /\.m3u8(\?|$)/i.test(url);

      // 创建播放器实例
      const art = new Artplayer({
        container: containerRef.current,
        url,
        type: isM3u8 ? 'm3u8' : '',
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
        // 注意：不要设置 crossOrigin=anonymous
        // 许多盗链图床/播放站不会返回 CORS 头，强制 CORS 会直接导致 poster/视频加载失败
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
              enableWorker: false,
              lowLatencyMode: true,
              maxBufferLength: 30,
              backBufferLength: 30,
              maxBufferSize: 60 * 1000 * 1000,
              loader: (blockAdRef.current
                ? CustomHlsJsLoader
                : Hls.DefaultConfig.loader) as unknown as typeof Hls.DefaultConfig.loader,
            });

            hls.loadSource(url);
            hls.attachMedia(video);
            video.hls = hls;

            ensureVideoSource(video, url);

            let reportedSuccess = false;
            const reportSuccessOnce = () => {
              if (reportedSuccess) return;
              reportedSuccess = true;
              recordUrlHealth(url, true, { weight: 0.6 });
            };

            hls.on(Hls.Events.FRAG_LOADED, reportSuccessOnce);

            hls.on(
              Hls.Events.ERROR,
              function (
                _event: string,
                data: { fatal?: boolean; type?: string; details?: string },
              ) {
                logError('HLS Error', _event, data);
                if (data.fatal) {
                  // 致命错误基本可视为“该 host 当前不可用”
                  recordUrlHealth(url, false, { weight: 1 });
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
              },
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
        controls: callbacksRef.current.onNextEpisode
          ? [
              {
                position: 'left',
                index: 13,
                html: '<i class="art-icon flex"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
                tooltip: '播放下一集',
                click: function () {
                  callbacksRef.current.onNextEpisode?.();
                },
              },
            ]
          : [],
      });

      playerRef.current = art;
      setPlayer(art);
      setIsReady(false);
      lastUrlRef.current = url;

      // 定义事件处理器
      const handleReady = () => {
        setIsReady(true);
        callbacksRef.current.onReady?.();
      };

      const handleVolumeChange = () => {
        callbacksRef.current.onVolumeChange?.(art.volume);
      };

      const handleTimeUpdate = () => {
        const currentTime = art.currentTime || 0;
        const duration = art.duration || 0;
        callbacksRef.current.onTimeUpdate?.(currentTime, duration);
      };

      const handleCanPlay = () => {
        // 视频可播放时触发：对 mp4 / 非 m3u8 也能记录成功
        recordUrlHealth(url, true, { weight: 0.4 });
      };

      const handleError = (err: Error | string) => {
        logError('播放器错误', err);
        recordUrlHealth(url, false, { weight: 1 });
        callbacksRef.current.onError?.(err);
      };

      const handleEnded = () => {
        callbacksRef.current.onEnded?.();
      };

      const handlePause = () => {
        callbacksRef.current.onPause?.();
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

    } catch (err) {
      logError('创建播放器失败', err);
      callbacksRef.current.onError?.(err instanceof Error ? err : String(err));
      playerRef.current = null;
      setPlayer(null);
      setIsReady(false);
    }
  }, [
    enabled,
    reinitKey,
    url,
    poster,
    containerRef,
    blockAdEnabled,
    loading,
  ]);

  // 更新元信息（不切源）
  useEffect(() => {
    if (!enabled || !playerRef.current) return;
    try {
      playerRef.current.title = title;
      playerRef.current.poster = poster;
    } catch {
      // ignore
    }
  }, [enabled, title, poster]);

  // 切源：仅当 URL 变化时触发，避免标题/封面更新导致闪屏
  useEffect(() => {
    if (!enabled || loading || !url) return;
    const art = playerRef.current;
    if (!art) return;
    if (url === lastUrlRef.current) return;

    const isM3u8 = /\.m3u8(\?|$)/i.test(url);
    try {
      art.type = isM3u8 ? 'm3u8' : '';
    } catch {
      // ignore
    }

    void art
      .switchUrl(url)
      .then(() => {
        lastUrlRef.current = url;
        if (art.video) {
          ensureVideoSource(art.video as HTMLVideoElement, url);
        }
      })
      .catch((err) => {
        logError('切换播放地址失败', err);
        callbacksRef.current.onError?.(
          err instanceof Error ? err : new Error(String(err)),
        );
        destroy();
        setReinitKey((k) => k + 1);
      });
  }, [enabled, loading, url, destroy]);

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

  return {
    player,
    isReady,
    play,
    pause,
    seek,
    destroy,
  };
}

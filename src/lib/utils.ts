/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import Hls from 'hls.js';

/**
 * 获取图片代理 URL 设置
 */
export function getImageProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 本地未开启图片代理，则不使用代理
  const enableImageProxy = localStorage.getItem('enableImageProxy');
  if (enableImageProxy !== null) {
    if (!JSON.parse(enableImageProxy) as boolean) {
      return null;
    }
  }

  const localImageProxy = localStorage.getItem('imageProxyUrl');
  if (localImageProxy != null) {
    return localImageProxy.trim() ? localImageProxy.trim() : null;
  }

  // 如果未设置，则使用全局对象
  const serverImageProxy = (window as any).RUNTIME_CONFIG?.IMAGE_PROXY;
  return serverImageProxy && serverImageProxy.trim()
    ? serverImageProxy.trim()
    : null;
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 避免 HTTPS 页面出现 Mixed Content（浏览器也会自动升级，但会刷控制台警告）
  if (originalUrl.startsWith('http://')) {
    originalUrl = `https://${originalUrl.slice('http://'.length)}`;
  }

  // 本地显式关闭图片代理时，尊重用户选择
  if (typeof window !== 'undefined') {
    const enableImageProxy = localStorage.getItem('enableImageProxy');
    if (enableImageProxy !== null) {
      try {
        if (!JSON.parse(enableImageProxy) as boolean) {
          return originalUrl;
        }
      } catch {
        // ignore malformed localStorage
      }
    }
  }

  const proxyUrl = getImageProxyUrl();
  if (proxyUrl) return `${proxyUrl}${encodeURIComponent(originalUrl)}`;

  return originalUrl;
}

/**
 * 获取豆瓣代理 URL 设置
 */
export function getDoubanProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 本地未开启豆瓣代理，则不使用代理
  const enableDoubanProxy = localStorage.getItem('enableDoubanProxy');
  if (enableDoubanProxy !== null) {
    if (!JSON.parse(enableDoubanProxy) as boolean) {
      return null;
    }
  }

  const localDoubanProxy = localStorage.getItem('doubanProxyUrl');
  if (localDoubanProxy != null) {
    return localDoubanProxy.trim() ? localDoubanProxy.trim() : null;
  }

  // 如果未设置，则使用全局对象
  const serverDoubanProxy = (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY;
  return serverDoubanProxy && serverDoubanProxy.trim()
    ? serverDoubanProxy.trim()
    : null;
}

/**
 * 处理豆瓣 URL，如果设置了豆瓣代理则使用代理
 */
export function processDoubanUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  const proxyUrl = getDoubanProxyUrl();
  if (!proxyUrl) return originalUrl;

  return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .replace(/&nbsp;/g, ' ') // 将 &nbsp; 替换为空格
    .trim(); // 去掉首尾空格
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(
  m3u8Url: string,
  options?: { signal?: AbortSignal },
): Promise<{
  quality: string; // 如720p、1080p等
  loadSpeed: string; // 自动转换为KB/s或MB/s
  pingTime: number; // 网络延迟（毫秒）
}> {
  try {
    // 直接使用m3u8 URL作为视频源，避免CORS问题
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('getVideoResolutionFromM3u8 must run in browser'));
        return;
      }

      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';

      let isSettled = false;
      let hls: Hls | null = null;
      const signal = options?.signal;
      const cleanup = () => {
        try {
          hls?.destroy();
        } catch {
          // ignore
        }
        try {
          video.remove();
        } catch {
          // ignore
        }
      };

      const abortError = () => {
        try {
          return new DOMException('Aborted', 'AbortError');
        } catch {
          return new Error('Aborted');
        }
      };

      // 测量网络延迟（ping时间） - 使用m3u8 URL而不是ts文件
      const pingStart = performance.now();
      let pingTime = 0;

      // 测量ping时间（使用m3u8 URL）
      fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors', signal })
        .then(() => {
          pingTime = performance.now() - pingStart;
        })
        .catch(() => {
          pingTime = performance.now() - pingStart; // 记录到失败为止的时间
        });

      // 固定使用hls.js加载（测速场景尽量避免 worker 开销）
      const hlsInstance = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 1,
        backBufferLength: 0,
        maxBufferSize: 2 * 1024 * 1024,
        fragLoadingMaxRetry: 1,
      });
      hls = hlsInstance;

      // 设置超时处理
      const timeout = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(new Error('Timeout loading video metadata'));
      }, 4000);

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeout);
          if (!isSettled) {
            isSettled = true;
            cleanup();
            reject(signal.reason ?? abortError());
          }
          return;
        }

        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timeout);
            if (isSettled) return;
            isSettled = true;
            cleanup();
            reject(signal.reason ?? abortError());
          },
          { once: true },
        );
      }

      video.onerror = () => {
        clearTimeout(timeout);
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      let actualLoadSpeed = '未知';
      let hasSpeedCalculated = false;
      let hasMetadataLoaded = false;

      let fragmentStartTime = 0;

      // 检查是否可以返回结果
      const checkAndResolve = () => {
        if (
          hasMetadataLoaded &&
          (hasSpeedCalculated || actualLoadSpeed !== '未知')
        ) {
          clearTimeout(timeout);
          const width = video.videoWidth;
          if (width && width > 0) {
            if (isSettled) return;
            isSettled = true;
            cleanup();

            // 根据视频宽度判断视频质量等级，使用经典分辨率的宽度作为分割点
            const quality =
              width >= 3840
                ? '4K' // 4K: 3840x2160
                : width >= 2560
                  ? '2K' // 2K: 2560x1440
                  : width >= 1920
                    ? '1080p' // 1080p: 1920x1080
                    : width >= 1280
                      ? '720p' // 720p: 1280x720
                      : width >= 854
                        ? '480p'
                        : 'SD'; // 480p: 854x480

            resolve({
              quality,
              loadSpeed: actualLoadSpeed,
              pingTime: Math.round(pingTime),
            });
          } else {
            // webkit 无法获取尺寸，直接返回
            if (isSettled) return;
            isSettled = true;
            cleanup();
            resolve({
              quality: '未知',
              loadSpeed: actualLoadSpeed,
              pingTime: Math.round(pingTime),
            });
          }
        }
      };

      // 监听片段加载开始
      hlsInstance.on(Hls.Events.FRAG_LOADING, () => {
        fragmentStartTime = performance.now();
      });

      // 监听片段加载完成，只需首个分片即可计算速度
      hlsInstance.on(
        Hls.Events.FRAG_LOADED,
        (_event: string, data: { payload?: ArrayBuffer; frag?: unknown }) => {
          if (
            fragmentStartTime > 0 &&
            data &&
            data.payload &&
            !hasSpeedCalculated
          ) {
            const loadTime = performance.now() - fragmentStartTime;
            const size = data.payload.byteLength || 0;

            if (loadTime > 0 && size > 0) {
              const speedKBps = size / 1024 / (loadTime / 1000);

              // 立即计算速度，无需等待更多分片
              const avgSpeedKBps = speedKBps;

              if (avgSpeedKBps >= 1024) {
                actualLoadSpeed = `${(avgSpeedKBps / 1024).toFixed(1)} MB/s`;
              } else {
                actualLoadSpeed = `${avgSpeedKBps.toFixed(1)} KB/s`;
              }
              hasSpeedCalculated = true;
              checkAndResolve(); // 尝试返回结果
            }
          }
        },
      );

      hlsInstance.loadSource(m3u8Url);
      hlsInstance.attachMedia(video);

      // 监听hls.js错误
      hlsInstance.on(
        Hls.Events.ERROR,
        (
          _event: string,
          data: { fatal?: boolean; type?: string; details?: string },
        ) => {
          console.error('HLS错误:', data);
          if (data.fatal) {
            clearTimeout(timeout);
            if (isSettled) return;
            isSettled = true;
            cleanup();
            reject(new Error(`HLS播放失败: ${data.type}`));
          }
        },
      );

      // 监听视频元数据加载完成
      video.onloadedmetadata = () => {
        hasMetadataLoaded = true;
        checkAndResolve(); // 尝试返回结果
      };
    });
  } catch (error) {
    throw new Error(
      `Error getting video resolution: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

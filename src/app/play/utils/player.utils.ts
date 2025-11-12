/**
 * 播放器相关工具函数
 */

/**
 * 确保视频源正确设置
 */
export function ensureVideoSource(video: HTMLVideoElement, url: string): void {
  if (!video.src || video.src !== url) {
    video.src = url;
  }
}

/**
 * 检测是否为 Safari 浏览器
 * 更可靠的检测方法，替代过时的 webkitConvertPointFromNodeToPage
 */
export function isSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();
  return /safari/.test(ua) && !/chrome/.test(ua) && !/android/.test(ua);
}

/**
 * 格式化时间（秒 -> MM:SS 或 HH:MM:SS）
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

/**
 * 解析时间字符串（支持 2:10、130 等格式）
 * @param timeStr - 时间字符串
 * @returns 秒数
 */
export function parseTimeString(timeStr: string): number {
  if (!timeStr) return 0;

  // 如果包含冒号，按 MM:SS 格式解析
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  // 否则直接解析为秒数
  return parseInt(timeStr, 10) || 0;
}

/**
 * 计算目标播放时间
 * 如果目标时间接近视频结束（<5秒），跳到结束前5秒
 */
export function calculateTargetTime(
  targetTime: number,
  duration: number
): number {
  if (!duration || targetTime < 0) return 0;

  // 如果目标时间接近结束，跳到结束前5秒
  if (targetTime >= duration - 2) {
    return Math.max(0, duration - 5);
  }

  // 确保不超过总时长
  return Math.min(targetTime, duration);
}

/**
 * 获取保存播放进度的时间间隔（毫秒）
 * 根据存储类型返回不同的间隔
 */
export function getSaveInterval(): number {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;

  switch (storageType) {
    case 'd1':
      return 10000; // 10秒
    case 'upstash':
      return 20000; // 20秒
    default:
      return 5000; // 5秒（默认）
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= wait) {
      lastCall = now;
      func(...args);
    } else {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, wait - (now - lastCall));
    }
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/* eslint-disable no-console */

/**
 * 请求管理器 - 提供重试、并发控制、熔断、缓存等功能
 * 解决 DNS 失败、网络超时、源站失效等问题
 */

// ============================================================================
// 1. 全局配置
// ============================================================================

const CONFIG = {
  // 并发控制 (优化: 提高并发限制)
  MAX_CONCURRENT_REQUESTS: 10, // 全局最大并发数 (5→10)
  MAX_CONCURRENT_PER_HOST: 3, // 每个域名最大并发数 (2→3)

  // 重试配置
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 500, // 初始重试延迟 (1000→500ms)
  MAX_RETRY_DELAY: 5000, // 最大重试延迟 (10000→5000ms)
  RETRY_BACKOFF_MULTIPLIER: 1.5, // 指数退避倍数 (2→1.5)

  // 超时配置
  DEFAULT_TIMEOUT: 8000,
  SPEED_TEST_TIMEOUT: 3000, // 测速超时 (5000→3000ms)

  // 熔断器配置 (优化: 更宽容的熔断策略)
  CIRCUIT_BREAKER_THRESHOLD: 8, // 连续失败次数阈值 (5→8)
  CIRCUIT_BREAKER_TIMEOUT: 30000, // 熔断恢复时间 (60000→30000ms)
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: 1, // 半开状态成功次数阈值 (2→1)

  // 缓存配置 (优化: 增加 TTL 减少重复请求)
  CACHE_TTL: 1800000, // 缓存 TTL: 30 分钟 (300000→1800000ms)
  CACHE_MAX_SIZE: 1000, // 最大缓存条目数 (500→1000)

  // 测速配置
  SPEED_TEST_SAMPLE_SIZE: 5, // 测速采样数 (3→5)
  SPEED_TEST_BATCH_SIZE: 5, // 测速批次大小 (3→5)

  // 新增: HTTP 状态码重试
  RETRYABLE_HTTP_STATUS: [429, 500, 502, 503, 504],
};

// ============================================================================
// 2. 类型定义
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[]; // 可重试的错误类型
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RequestQueueItem<T = unknown> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  host: string;
}

// ============================================================================
// 3. LRU 缓存实现
// ============================================================================

class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, CacheEntry<V>>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 重新插入到末尾
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: K, value: V, ttl: number = CONFIG.CACHE_TTL): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果超过最大容量，删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// 4. 熔断器实现
// ============================================================================

class CircuitBreaker {
  private states: Map<string, CircuitBreakerState> = new Map();

  private getState(key: string): CircuitBreakerState {
    const existing = this.states.get(key);
    if (existing) {
      return existing;
    }
    const initialState: CircuitBreakerState = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
    this.states.set(key, initialState);
    return initialState;
  }

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const state = this.getState(key);
    const now = Date.now();

    // OPEN 状态：检查是否可以进入 HALF_OPEN
    if (state.state === 'OPEN') {
      if (now < state.nextAttemptTime) {
        console.warn(`[熔断器] ${key} 处于熔断状态，拒绝请求`);
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      }
      // 进入半开状态
      state.state = 'HALF_OPEN';
      state.successCount = 0;
      console.log(`[熔断器] ${key} 进入半开状态，尝试恢复`);
    }

    try {
      const result = await fn();

      // 成功处理
      if (state.state === 'HALF_OPEN') {
        state.successCount++;
        if (state.successCount >= CONFIG.CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
          state.state = 'CLOSED';
          state.failureCount = 0;
          console.log(`[熔断器] ${key} 恢复正常`);
        }
      } else {
        state.failureCount = 0;
      }

      return result;
    } catch (error) {
      // 失败处理
      state.failureCount++;
      state.lastFailureTime = now;

      if (state.state === 'HALF_OPEN') {
        // 半开状态失败，直接熔断
        state.state = 'OPEN';
        state.nextAttemptTime = now + CONFIG.CIRCUIT_BREAKER_TIMEOUT;
        console.warn(`[熔断器] ${key} 半开状态失败，重新熔断`);
      } else if (state.failureCount >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
        // 达到阈值，熔断
        state.state = 'OPEN';
        state.nextAttemptTime = now + CONFIG.CIRCUIT_BREAKER_TIMEOUT;
        console.warn(
          `[熔断器] ${key} 连续失败 ${state.failureCount} 次，触发熔断`,
        );
      }

      if (fallback && state.state === 'OPEN') {
        return fallback();
      }

      throw error;
    }
  }

  // 手动重置熔断器
  reset(key: string): void {
    this.states.delete(key);
    console.log(`[熔断器] ${key} 已重置`);
  }

  // 获取所有熔断的源
  getOpenCircuits(): string[] {
    return Array.from(this.states.entries())
      .filter(([_, state]) => state.state === 'OPEN')
      .map(([key]) => key);
  }
}

// ============================================================================
// 5. 请求队列（并发控制）
// ============================================================================

class RequestQueue {
  private queue: RequestQueueItem<unknown>[] = [];
  private running = 0;
  private hostConcurrency: Map<string, number> = new Map();

  async add<T>(fn: () => Promise<T>, host: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        host,
      } as RequestQueueItem<unknown>);
      this.process();
    });
  }

  private async process(): Promise<void> {
    // 检查全局并发限制
    if (this.running >= CONFIG.MAX_CONCURRENT_REQUESTS) {
      return;
    }

    // 查找可执行的请求（不超过该主机的并发限制）
    const index = this.queue.findIndex((item) => {
      const hostCount = this.hostConcurrency.get(item.host) || 0;
      return hostCount < CONFIG.MAX_CONCURRENT_PER_HOST;
    });

    if (index === -1) return;

    const item = this.queue.splice(index, 1)[0];
    this.running++;

    const hostCount = this.hostConcurrency.get(item.host) || 0;
    this.hostConcurrency.set(item.host, hostCount + 1);

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error: unknown) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      const currentCount = this.hostConcurrency.get(item.host) || 1;
      this.hostConcurrency.set(item.host, currentCount - 1);

      // 继续处理队列
      this.process();
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getRunningCount(): number {
    return this.running;
  }
}

// ============================================================================
// 6. 重试机制（指数退避）
// ============================================================================

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = CONFIG.MAX_RETRIES,
    initialDelay = CONFIG.INITIAL_RETRY_DELAY,
    maxDelay = CONFIG.MAX_RETRY_DELAY,
    backoffMultiplier = CONFIG.RETRY_BACKOFF_MULTIPLIER,
    retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNREFUSED',
      'NetworkError',
      'AbortError',
      'HTTP_RETRYABLE', // 新增: 支持 HTTP 状态码重试
    ],
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 最后一次尝试，直接抛出
      if (attempt === maxRetries) {
        break;
      }

      // 检查是否是可重试的错误
      const err = error instanceof Error ? error : null;
      const isRetryable = retryableErrors.some(
        (errCode) =>
          (err as NodeJS.ErrnoException)?.code === errCode ||
          err?.message?.includes(errCode) ||
          ((err as NodeJS.ErrnoException)?.cause as NodeJS.ErrnoException)
            ?.code === errCode,
      );

      if (!isRetryable) {
        console.log(`[重试] 不可重试的错误: ${err?.message || String(error)}`);
        throw error;
      }

      // 计算延迟（指数退避）
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay,
      );

      console.log(
        `[重试] 第 ${attempt + 1}/${maxRetries} 次重试，${delay}ms 后重试...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================================================
// 7. 单例实例
// ============================================================================

class RequestManager {
  private cache: LRUCache<string, unknown>;
  private circuitBreaker: CircuitBreaker;
  private queue: RequestQueue;

  constructor() {
    this.cache = new LRUCache(CONFIG.CACHE_MAX_SIZE);
    this.circuitBreaker = new CircuitBreaker();
    this.queue = new RequestQueue();
  }

  /**
   * 带缓存、重试、熔断、并发控制的请求
   */
  async fetch<T>(
    url: string,
    options: RequestInit & {
      retryOptions?: RetryOptions;
      timeout?: number;
      skipCache?: boolean; // 新增: 跳过缓存
    } = {},
  ): Promise<T> {
    // 优化: 只用 URL 作为缓存键 (忽略 headers/timeout 等)
    const cacheKey = `fetch:${url}`;

    // 1. 尝试从缓存获取 (除非明确跳过)
    if (!options.skipCache) {
      const cached = this.cache.get(cacheKey) as T | null;
      if (cached !== null) {
        return cached;
      }
    }

    // 2. 提取主机名（用于熔断和并发控制）
    const host = new URL(url).hostname;

    // 3. 通过队列执行（并发控制）
    const result = await this.queue.add(async () => {
      // 4. 通过熔断器执行
      return this.circuitBreaker.execute(
        host,
        async () => {
          // 5. 通过重试执行
          return fetchWithRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              options.timeout || CONFIG.DEFAULT_TIMEOUT,
            );

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              // 优化: 支持 HTTP 状态码重试
              if (!response.ok) {
                const isRetryable = CONFIG.RETRYABLE_HTTP_STATUS.includes(
                  response.status,
                );
                const error = new Error(
                  `HTTP ${response.status}: ${response.statusText}`,
                );
                if (isRetryable) {
                  // 标记为可重试错误
                  (error as NodeJS.ErrnoException).code = 'HTTP_RETRYABLE';
                }
                throw error;
              }

              const contentType = response.headers.get('content-type');
              let data: unknown;

              // 先获取文本内容
              const text = await response.text();

              // 尝试解析为 JSON (很多 API 返回 text/html 但实际是 JSON)
              if (
                contentType?.includes('application/json') ||
                text.trim().startsWith('{') ||
                text.trim().startsWith('[')
              ) {
                try {
                  data = JSON.parse(text);
                } catch {
                  data = text;
                }
              } else {
                data = text;
              }

              return data as T;
            } catch (error: unknown) {
              clearTimeout(timeoutId);
              throw error;
            }
          }, options.retryOptions);
        },
        // 熔断时的降级策略
        undefined,
      );
    }, host);

    // 6. 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 获取熔断状态
   */
  getCircuitBreakerStatus(): string[] {
    return this.circuitBreaker.getOpenCircuits();
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(host: string): void {
    this.circuitBreaker.reset(host);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { queueSize: number; runningCount: number } {
    return {
      queueSize: this.queue.getQueueSize(),
      runningCount: this.queue.getRunningCount(),
    };
  }

  /**
   * 智能测速（优化版）
   * - 只测试N个随机样本
   * - 批量并发控制
   * - 超时快速失败
   */
  async speedTestSources<T extends { source: string; id: string }>(
    sources: T[],
    testFn: (source: T) => Promise<{
      quality: string;
      loadSpeed: string;
      pingTime: number;
    }>,
  ): Promise<
    Map<
      string,
      {
        quality: string;
        loadSpeed: string;
        pingTime: number;
        hasError?: boolean;
      }
    >
  > {
    const resultsMap = new Map();

    // 智能采样：如果源太多，只测试部分
    const samplingSources =
      sources.length > CONFIG.SPEED_TEST_SAMPLE_SIZE
        ? this.shuffleArray(sources).slice(0, CONFIG.SPEED_TEST_SAMPLE_SIZE)
        : sources;

    console.log(
      `[测速] 从 ${sources.length} 个源中采样 ${samplingSources.length} 个进行测速`,
    );

    // 分批测速
    for (
      let i = 0;
      i < samplingSources.length;
      i += CONFIG.SPEED_TEST_BATCH_SIZE
    ) {
      const batch = samplingSources.slice(i, i + CONFIG.SPEED_TEST_BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (source) => {
          const sourceKey = `${source.source}-${source.id}`;

          try {
            // 使用更短的超时
            const timeout = new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('测速超时')),
                CONFIG.SPEED_TEST_TIMEOUT,
              ),
            );

            const result = await Promise.race([testFn(source), timeout]);

            return { sourceKey, result };
          } catch (error) {
            console.warn(`[测速] ${sourceKey} 失败:`, error);
            return {
              sourceKey,
              result: {
                quality: '错误',
                loadSpeed: '未知',
                pingTime: 0,
                hasError: true,
              },
            };
          }
        }),
      );

      // 保存结果
      batchResults.forEach((settledResult) => {
        if (settledResult.status === 'fulfilled') {
          const { sourceKey, result } = settledResult.value;
          resultsMap.set(sourceKey, result);
        }
      });

      // 批次间延迟
      if (i + CONFIG.SPEED_TEST_BATCH_SIZE < samplingSources.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return resultsMap;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// ============================================================================
// 8. 导出单例
// ============================================================================

export const requestManager = new RequestManager();
export { CONFIG as REQUEST_CONFIG };

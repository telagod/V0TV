/**
 * 客户端（浏览器）测速优化器
 *
 * 与 request-manager.ts 的区别：
 * - request-manager.ts: 服务端（Node.js/Edge Runtime）使用
 * - client-speed-test.ts: 客户端（浏览器）使用
 */

// ============================================================================
// 配置
// ============================================================================

const CLIENT_SPEED_TEST_CONFIG = {
  // 智能采样：从N个源中随机选择几个测速
  SAMPLE_SIZE: 3,

  // 批次控制：每批测速几个源
  BATCH_SIZE: 3,

  // 批次间延迟（ms）
  BATCH_DELAY: 500,

  // 单个测速超时（ms）
  TIMEOUT: 5000,

  // 最大并发测速数
  MAX_CONCURRENT: 3,
};

// ============================================================================
// 类型定义
// ============================================================================

interface SpeedTestResult {
  quality: string;
  loadSpeed: string;
  pingTime: number;
  hasError?: boolean;
  score?: number; // 添加可选的 score 字段
}

interface SourceWithKey {
  source: string;
  id: string;
  [key: string]: any;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * Fisher-Yates 洗牌算法
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带超时的 Promise
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// ============================================================================
// 并发控制器
// ============================================================================

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    // 如果达到并发上限，进入队列
    while (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;

      // 释放队列中的下一个任务
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getRunningCount(): number {
    return this.running;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

// ============================================================================
// 主要功能：智能测速
// ============================================================================

/**
 * 智能测速：采样 + 批次控制 + 并发限制
 *
 * @param sources 所有播放源
 * @param testFn 测速函数（返回质量、速度、延迟）
 * @param config 配置项（可选）
 * @returns Map<sourceKey, result>
 */
export async function smartSpeedTest<T extends SourceWithKey>(
  sources: T[],
  testFn: (source: T) => Promise<SpeedTestResult>,
  config: Partial<typeof CLIENT_SPEED_TEST_CONFIG> = {}
): Promise<Map<string, SpeedTestResult>> {
  const finalConfig = { ...CLIENT_SPEED_TEST_CONFIG, ...config };
  const resultsMap = new Map<string, SpeedTestResult>();

  // 如果源数量少，不需要采样
  if (sources.length <= finalConfig.SAMPLE_SIZE) {
    console.log(`[客户端测速] 源数量较少(${sources.length}个)，全部测速`);
  } else {
    console.log(
      `[客户端测速] 从 ${sources.length} 个源中采样 ${finalConfig.SAMPLE_SIZE} 个进行测速`
    );
  }

  // 智能采样
  const samplingSources =
    sources.length > finalConfig.SAMPLE_SIZE
      ? shuffleArray(sources).slice(0, finalConfig.SAMPLE_SIZE)
      : sources;

  // 创建并发控制器
  const limiter = new ConcurrencyLimiter(finalConfig.MAX_CONCURRENT);

  // 分批测速
  for (
    let batchIndex = 0;
    batchIndex < samplingSources.length;
    batchIndex += finalConfig.BATCH_SIZE
  ) {
    const batch = samplingSources.slice(
      batchIndex,
      batchIndex + finalConfig.BATCH_SIZE
    );

    console.log(
      `[客户端测速] 批次 ${
        Math.floor(batchIndex / finalConfig.BATCH_SIZE) + 1
      }/${Math.ceil(samplingSources.length / finalConfig.BATCH_SIZE)}，测速 ${
        batch.length
      } 个源`
    );

    // 批内并发（受并发限制器控制）
    const batchPromises = batch.map((source) =>
      limiter.run(async () => {
        const sourceKey = `${source.source}-${source.id}`;

        try {
          // 带超时的测速
          const result = await withTimeout(
            testFn(source),
            finalConfig.TIMEOUT,
            '测速超时'
          );

          console.log(
            `[客户端测速] ✅ ${sourceKey}: ${result.quality}, ${result.loadSpeed}, ${result.pingTime}ms`
          );

          return { sourceKey, result };
        } catch (error: any) {
          console.warn(`[客户端测速] ❌ ${sourceKey} 失败: ${error.message}`);

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
      })
    );

    // 等待当前批次完成
    const batchResults = await Promise.allSettled(batchPromises);

    // 保存结果
    batchResults.forEach((settledResult) => {
      if (settledResult.status === 'fulfilled') {
        const { sourceKey, result } = settledResult.value;
        resultsMap.set(sourceKey, result);
      }
    });

    // 批次间延迟（避免浏览器资源耗尽）
    if (batchIndex + finalConfig.BATCH_SIZE < samplingSources.length) {
      await delay(finalConfig.BATCH_DELAY);
    }
  }

  console.log(
    `[客户端测速] 完成，成功 ${
      Array.from(resultsMap.values()).filter((r) => !r.hasError).length
    }/${samplingSources.length}`
  );

  return resultsMap;
}

// ============================================================================
// 导出配置（允许外部修改）
// ============================================================================

export { CLIENT_SPEED_TEST_CONFIG };

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例：
 *
 * ```typescript
 * import { smartSpeedTest } from '@/lib/client-speed-test';
 * import { getVideoResolutionFromM3u8 } from '@/lib/utils';
 *
 * // 测速
 * const testResults = await smartSpeedTest(
 *   sources,  // 10个播放源
 *   async (source) => {
 *     const episodeUrl = source.episodes[0];
 *     return await getVideoResolutionFromM3u8(episodeUrl);
 *   }
 * );
 *
 * // 自定义配置
 * const testResults = await smartSpeedTest(
 *   sources,
 *   testFn,
 *   {
 *     SAMPLE_SIZE: 5,      // 采样5个
 *     BATCH_SIZE: 2,       // 每批2个
 *     MAX_CONCURRENT: 2,   // 最多2个并发
 *     TIMEOUT: 3000,       // 3秒超时
 *   }
 * );
 * ```
 */

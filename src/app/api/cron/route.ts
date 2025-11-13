/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getDb } from '@/lib/get-db';
import { fetchVideoDetail } from '@/lib/fetchVideoDetail';
import { Favorite, PlayRecord, SearchResult } from '@/lib/types';


export async function GET(request: NextRequest) {
  console.log(request.url);
  try {
    const db = await getDb();
    console.log('Cron job triggered:', new Date().toISOString());

    refreshRecordAndFavorites(db);

    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Cron job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// 定时任务优化配置
// ============================================================================

interface CronOptimizationConfig {
  // 只刷新最近N天的记录（0 = 全部刷新）
  recentDays: number;

  // 批次大小（每批处理几个）
  batchSize: number;

  // 批次间延迟（毫秒）
  batchDelayMs: number;

  // 是否启用智能优化
  enableOptimization: boolean;
}

const CRON_CONFIG: CronOptimizationConfig = {
  recentDays: 30, // 只刷新最近30天的记录
  batchSize: 5, // 每批处理5个
  batchDelayMs: 1000, // 批次间延迟1秒
  enableOptimization: true, // 默认启用优化
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 过滤最近N天的记录
 */
function filterRecentRecords<T extends { save_time: number }>(
  records: Record<string, T>,
  recentDays: number
): Record<string, T> {
  if (recentDays <= 0) return records;

  const now = Date.now();
  const cutoffTime = now - recentDays * 24 * 60 * 60 * 1000;

  const filtered: Record<string, T> = {};
  let skippedCount = 0;

  for (const [key, record] of Object.entries(records)) {
    if (record.save_time >= cutoffTime) {
      filtered[key] = record;
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    console.log(`⏭️ 跳过 ${skippedCount} 条超过 ${recentDays} 天的旧记录`);
  }

  return filtered;
}

/**
 * 批量处理记录
 */
async function processBatch<T>(
  items: Array<{ key: string; data: T }>,
  processFn: (key: string, data: T) => Promise<void>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  await Promise.allSettled(
    items.map(async ({ key, data }) => {
      try {
        await processFn(key, data);
        success++;
      } catch (err) {
        console.error(`❌ 处理失败 (${key}):`, err);
        failed++;
      }
    })
  );

  return { success, failed };
}

async function refreshRecordAndFavorites(db: any) {
  if (
    (process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage') === 'localstorage'
  ) {
    console.log('⏭️ 跳过刷新：当前使用 localstorage 存储模式');
    return;
  }

  const startTime = Date.now();

  try {
    const users = await db.getAllUsers();
    if (process.env.USERNAME && !users.includes(process.env.USERNAME)) {
      users.push(process.env.USERNAME);
    }

    console.log(`👥 开始处理 ${users.length} 个用户`);
    console.log(`⚙️ 优化配置: ${JSON.stringify(CRON_CONFIG)}`);

    // 函数级缓存：key 为 `${source}+${id}`，值为 Promise<VideoDetail | null>
    const detailCache = new Map<string, Promise<SearchResult | null>>();

    // 获取详情 Promise（带缓存和错误处理）
    const getDetail = async (
      source: string,
      id: string,
      fallbackTitle: string
    ): Promise<SearchResult | null> => {
      const key = `${source}+${id}`;
      let promise = detailCache.get(key);
      if (!promise) {
        promise = fetchVideoDetail({
          source,
          id,
          fallbackTitle: fallbackTitle.trim(),
        })
          .then((detail) => {
            // 成功时才缓存结果
            const successPromise = Promise.resolve(detail);
            detailCache.set(key, successPromise);
            return detail;
          })
          .catch((err) => {
            console.error(`❌ 获取视频详情失败 (${source}+${id}):`, err);
            return null;
          });
      }
      return promise;
    };

    for (const user of users) {
      console.log(`\n👤 开始处理用户: ${user}`);

      // ========================================================================
      // 播放记录
      // ========================================================================
      try {
        const allPlayRecords = await db.getAllPlayRecords(user);
        const totalRecordsBeforeFilter = Object.keys(allPlayRecords).length;

        // 优化1：只处理最近N天的记录
        const playRecords = CRON_CONFIG.enableOptimization
          ? filterRecentRecords(allPlayRecords, CRON_CONFIG.recentDays)
          : allPlayRecords;

        const totalRecords = Object.keys(playRecords).length;
        console.log(
          `📺 播放记录: ${totalRecords} 条${
            totalRecordsBeforeFilter !== totalRecords
              ? ` (过滤前 ${totalRecordsBeforeFilter} 条)`
              : ''
          }`
        );

        if (totalRecords === 0) {
          console.log('⏭️ 无需处理播放记录');
        } else {
          const recordEntries = Object.entries(playRecords).map(
            ([key, record]: [string, PlayRecord]) => ({ key, data: record })
          );

          let processedRecords = 0;
          let updatedRecords = 0;
          let failedRecords = 0;

          // 优化2：批量处理
          for (
            let i = 0;
            i < recordEntries.length;
            i += CRON_CONFIG.batchSize
          ) {
            const batch = recordEntries.slice(i, i + CRON_CONFIG.batchSize);
            const batchIndex = Math.floor(i / CRON_CONFIG.batchSize) + 1;
            const totalBatches = Math.ceil(
              recordEntries.length / CRON_CONFIG.batchSize
            );

            console.log(
              `📦 处理播放记录批次 ${batchIndex}/${totalBatches} (${batch.length} 条)`
            );

            const { success, failed } = await processBatch<PlayRecord>(
              batch,
              async (key, record) => {
                const [source, id] = key.split('+');
                if (!source || !id) {
                  console.warn(`⚠️ 跳过无效的播放记录键: ${key}`);
                  return;
                }

                const detail = await getDetail(source, id, record.title);
                if (!detail) {
                  console.warn(`⚠️ 跳过无法获取详情的播放记录: ${key}`);
                  return;
                }

                const episodeCount = detail.episodes?.length || 0;
                if (
                  episodeCount > 0 &&
                  episodeCount !== record.total_episodes
                ) {
                  await db.savePlayRecord(user, source, id, {
                    title: detail.title || record.title,
                    source_name: record.source_name,
                    cover: detail.poster || record.cover,
                    index: record.index,
                    total_episodes: episodeCount,
                    play_time: record.play_time,
                    year: detail.year || record.year,
                    total_time: record.total_time,
                    save_time: record.save_time,
                    search_title: record.search_title,
                  });
                  console.log(
                    `✅ 更新播放记录: ${record.title} (${record.total_episodes} -> ${episodeCount})`
                  );
                  updatedRecords++;
                }
              }
            );

            processedRecords += success;
            failedRecords += failed;

            // 优化3：批次间延迟（避免请求过载）
            if (
              CRON_CONFIG.enableOptimization &&
              i + CRON_CONFIG.batchSize < recordEntries.length
            ) {
              await delay(CRON_CONFIG.batchDelayMs);
            }
          }

          console.log(
            `✅ 播放记录处理完成: ${processedRecords}/${totalRecords} (更新 ${updatedRecords} 条, 失败 ${failedRecords} 条)`
          );
        }
      } catch (err) {
        console.error(`❌ 获取用户播放记录失败 (${user}):`, err);
      }

      // ========================================================================
      // 收藏
      // ========================================================================
      try {
        const allFavorites = await db.getAllFavorites(user);
        const totalFavoritesBeforeFilter = Object.keys(allFavorites).length;

        // 优化1：只处理最近N天的记录
        const favorites = CRON_CONFIG.enableOptimization
          ? filterRecentRecords(allFavorites, CRON_CONFIG.recentDays)
          : allFavorites;

        const totalFavorites = Object.keys(favorites).length;
        console.log(
          `⭐ 收藏: ${totalFavorites} 条${
            totalFavoritesBeforeFilter !== totalFavorites
              ? ` (过滤前 ${totalFavoritesBeforeFilter} 条)`
              : ''
          }`
        );

        if (totalFavorites === 0) {
          console.log('⏭️ 无需处理收藏');
        } else {
          const favoriteEntries = Object.entries(favorites).map(
            ([key, fav]: [string, Favorite]) => ({ key, data: fav })
          );

          let processedFavorites = 0;
          let updatedFavorites = 0;
          let failedFavorites = 0;

          // 优化2：批量处理
          for (
            let i = 0;
            i < favoriteEntries.length;
            i += CRON_CONFIG.batchSize
          ) {
            const batch = favoriteEntries.slice(i, i + CRON_CONFIG.batchSize);
            const batchIndex = Math.floor(i / CRON_CONFIG.batchSize) + 1;
            const totalBatches = Math.ceil(
              favoriteEntries.length / CRON_CONFIG.batchSize
            );

            console.log(
              `📦 处理收藏批次 ${batchIndex}/${totalBatches} (${batch.length} 条)`
            );

            const { success, failed } = await processBatch<Favorite>(
              batch,
              async (key, fav) => {
                const [source, id] = key.split('+');
                if (!source || !id) {
                  console.warn(`⚠️ 跳过无效的收藏键: ${key}`);
                  return;
                }

                const favDetail = await getDetail(source, id, fav.title);
                if (!favDetail) {
                  console.warn(`⚠️ 跳过无法获取详情的收藏: ${key}`);
                  return;
                }

                const favEpisodeCount = favDetail.episodes?.length || 0;
                if (
                  favEpisodeCount > 0 &&
                  favEpisodeCount !== fav.total_episodes
                ) {
                  await db.saveFavorite(user, source, id, {
                    title: favDetail.title || fav.title,
                    source_name: fav.source_name,
                    cover: favDetail.poster || fav.cover,
                    year: favDetail.year || fav.year,
                    total_episodes: favEpisodeCount,
                    save_time: fav.save_time,
                    search_title: fav.search_title,
                  });
                  console.log(
                    `✅ 更新收藏: ${fav.title} (${fav.total_episodes} -> ${favEpisodeCount})`
                  );
                  updatedFavorites++;
                }
              }
            );

            processedFavorites += success;
            failedFavorites += failed;

            // 优化3：批次间延迟（避免请求过载）
            if (
              CRON_CONFIG.enableOptimization &&
              i + CRON_CONFIG.batchSize < favoriteEntries.length
            ) {
              await delay(CRON_CONFIG.batchDelayMs);
            }
          }

          console.log(
            `✅ 收藏处理完成: ${processedFavorites}/${totalFavorites} (更新 ${updatedFavorites} 条, 失败 ${failedFavorites} 条)`
          );
        }
      } catch (err) {
        console.error(`❌ 获取用户收藏失败 (${user}):`, err);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ 刷新播放记录/收藏任务完成 (耗时 ${duration}秒)`);
    console.log(`📊 缓存统计: 共缓存 ${detailCache.size} 个视频详情`);
  } catch (err) {
    console.error('❌ 刷新播放记录/收藏任务启动失败', err);
  }
}

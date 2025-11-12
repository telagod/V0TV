/**
 * useVideoData Hook
 * 管理视频数据获取和状态
 */

import { useState, useEffect, useCallback } from 'react';
import { searchFromApi, getDetailFromApi } from '@/lib/downstream';
import { getConfig } from '@/lib/config';
import { smartSpeedTest } from '@/lib/client-speed-test';
import { getVideoResolutionFromM3u8 } from '@/lib/utils';
import type {
  VideoData,
  UseVideoDataReturn,
  LoadingStage,
} from '../types/player.types';
import type { SearchResult } from '@/lib/types';

interface UseVideoDataOptions {
  initialSource: string;
  initialId: string;
  initialTitle: string;
  initialYear: string;
  needPrefer: boolean;
  searchTitle?: string;
  searchType?: string;
}

/**
 * 视频数据Hook
 * 负责加载视频详情和优选播放源
 */
export function useVideoData(options: UseVideoDataOptions): UseVideoDataReturn {
  const {
    initialSource,
    initialId,
    initialTitle,
    initialYear,
    needPrefer,
    searchTitle,
    searchType,
  } = options;

  const [data, setData] = useState<VideoData>({
    detail: null,
    currentSource: initialSource,
    currentId: initialId,
    currentEpisodeIndex: 0,
    videoTitle: initialTitle,
    videoYear: initialYear,
    videoCover: '',
    totalEpisodes: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('searching');
  const [error, setError] = useState<string | null>(null);

  // 加载视频数据
  useEffect(() => {
    if (!initialSource || !initialId) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }

    const loadVideoData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 如果需要优选
        if (needPrefer && searchTitle) {
          setLoadingStage('searching');

          // 搜索所有可用源
          const config = await getConfig();
          const apiSites = config.SourceConfig.filter((s) => !s.disabled).map((s) => ({
            key: s.key,
            name: s.name,
            api: s.api,
            detail: s.detail,
          }));

          const searchPromises = apiSites.map((site) =>
            searchFromApi(site, searchTitle).catch(() => [])
          );

          const searchResults = await Promise.all(searchPromises);
          const allResults = searchResults.flat();

          if (allResults.length === 0) {
            throw new Error('未找到匹配的播放源');
          }

          setLoadingStage('preferring');

          // 智能测速优选
          const speedTestResults = await smartSpeedTest(
            allResults,
            async (source) => {
              try {
                if (!source.episodes || source.episodes.length === 0) {
                  return {
                    quality: '未知',
                    loadSpeed: '0',
                    pingTime: 0,
                    score: 0,
                  };
                }

                const testUrl = source.episodes[0];
                const info = await getVideoResolutionFromM3u8(testUrl);

                return {
                  quality: info.quality || '未知',
                  loadSpeed: info.loadSpeed || '0',
                  pingTime: info.pingTime || 0,
                  score: calculateScore(info),
                };
              } catch {
                return {
                  quality: '未知',
                  loadSpeed: '0',
                  pingTime: 0,
                  score: 0,
                };
              }
            }
          );

          // 按评分排序，选择最佳源
          const sortedResults = allResults
            .map((result) => {
              const testResult = speedTestResults.get(
                `${result.source}-${result.id}`
              );
              return {
                ...result,
                score: testResult?.score || 0,
              };
            })
            .sort((a, b) => b.score - a.score);

          if (sortedResults.length > 0) {
            const bestSource = sortedResults[0];
            setData((prev) => ({
              ...prev,
              currentSource: bestSource.source,
              currentId: bestSource.id,
            }));

            // 继续获取详情
            setLoadingStage('fetching');
            const detail = await getDetailFromApi(
              apiSites.find((s) => s.key === bestSource.source)!,
              bestSource.id
            );

            setData((prev) => ({
              ...prev,
              detail,
              videoTitle: detail.title,
              videoYear: detail.year,
              videoCover: detail.poster,
              totalEpisodes: detail.episodes?.length || 0,
            }));
          }
        } else {
          // 直接获取详情
          setLoadingStage('fetching');

          const config = await getConfig();
          const apiSites = config.SourceConfig.filter((s) => !s.disabled).map((s) => ({
            key: s.key,
            name: s.name,
            api: s.api,
            detail: s.detail,
          }));
          const apiSite = apiSites.find((s) => s.key === initialSource);

          if (!apiSite) {
            throw new Error('未找到对应的播放源');
          }

          const detail = await getDetailFromApi(apiSite, initialId);

          setData((prev) => ({
            ...prev,
            detail,
            videoTitle: detail.title,
            videoYear: detail.year,
            videoCover: detail.poster,
            totalEpisodes: detail.episodes?.length || 0,
          }));
        }

        setLoadingStage('ready');
        setLoading(false);
      } catch (err) {
        console.error('加载视频数据失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      }
    };

    loadVideoData();
  }, [initialSource, initialId, needPrefer, searchTitle]);

  // 更新集数索引
  const updateEpisodeIndex = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      currentEpisodeIndex: index,
    }));
  }, []);

  // 更新源和ID
  const updateSource = useCallback((source: string, id: string) => {
    setData((prev) => ({
      ...prev,
      currentSource: source,
      currentId: id,
    }));
  }, []);

  return {
    data,
    loading,
    error,
    updateEpisodeIndex,
    updateSource,
  };
}

/**
 * 计算视频源评分
 */
function calculateScore(info: {
  quality?: string;
  loadSpeed?: string;
  pingTime?: number;
}): number {
  let score = 0;

  // 分辨率评分（40%）
  const quality = info.quality?.toLowerCase() || '';
  if (quality.includes('4k') || quality.includes('2160')) score += 40;
  else if (quality.includes('2k') || quality.includes('1440')) score += 34;
  else if (quality.includes('1080')) score += 30;
  else if (quality.includes('720')) score += 24;
  else if (quality.includes('480')) score += 16;
  else score += 10;

  // 速度评分（40%）
  const speed = parseFloat(info.loadSpeed || '0');
  if (speed > 5) score += 40;
  else if (speed > 3) score += 32;
  else if (speed > 1) score += 24;
  else if (speed > 0.5) score += 16;
  else score += 8;

  // 延迟评分（20%）
  const latency = info.pingTime || 999;
  if (latency < 100) score += 20;
  else if (latency < 200) score += 16;
  else if (latency < 300) score += 12;
  else if (latency < 500) score += 8;
  else score += 4;

  return score;
}

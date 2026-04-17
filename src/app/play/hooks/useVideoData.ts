/**
 * useVideoData Hook
 * 管理视频数据获取和状态
 */

import { useCallback, useEffect, useState } from 'react';

import { logError, logInfo } from '@/lib/logger';

import type {
  LoadingStage,
  UseVideoDataReturn,
  VideoData,
} from '../types/player.types';

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
    searchType: _searchType,
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

  const fetchJson = useCallback(async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : `Request failed: ${res.status}`;
      throw new Error(message);
    }
    return payload;
  }, []);

  // 加载视频数据
  useEffect(() => {
    // 如果不是优选模式，必须有 source 和 id
    if (!needPrefer && (!initialSource || !initialId)) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }

    // 如果是优选模式，必须有 searchTitle
    if (needPrefer && !searchTitle) {
      setError('缺少搜索标题');
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

          // 通过服务端聚合搜索（避免浏览器直连源站/CORS导致播放页无源）
          const searchData = await fetchJson(
            `/api/search?q=${encodeURIComponent(searchTitle)}`,
          );
          const allResults = [
            ...(searchData?.regular_results ?? searchData?.results ?? []),
            ...(searchData?.adult_results ?? []),
          ];

          if (allResults.length === 0) {
            throw new Error('未找到匹配的播放源');
          }

          setLoadingStage('preferring');

          // 基于源站数据快速优选（不做客户端测速，避免 CORS 问题）
          const scored = allResults.map((result) => {
            let score = 0;
            const eps = Array.isArray(result.episodes) ? result.episodes : [];
            // 有播放链接的优先
            if (eps.length > 0 && eps[0]) score += 50;
            // m3u8 链接优先
            if (eps[0] && String(eps[0]).includes('.m3u8')) score += 20;
            // 有海报的优先
            if (result.poster) score += 10;
            // 有豆瓣 ID 的优先
            if (result.douban_id) score += 5;
            // 标题完全匹配优先
            const titleNorm = String(result.title || '').replace(/\s/g, '');
            const searchNorm = String(searchTitle || '').replace(/\s/g, '');
            if (titleNorm === searchNorm) score += 30;
            else if (titleNorm.includes(searchNorm)) score += 15;
            return { ...result, score };
          });

          scored.sort((a, b) => b.score - a.score);

          logInfo(`[优选] ${scored.length} 个结果，最佳: ${scored[0]?.source}-${scored[0]?.id} (score=${scored[0]?.score})`);

          if (scored.length > 0) {
            const bestSource = scored[0];
            setData((prev) => ({
              ...prev,
              currentSource: bestSource.source,
              currentId: bestSource.id,
            }));

            // 继续获取详情
            setLoadingStage('fetching');
            const detail = await fetchJson(
              `/api/detail?source=${encodeURIComponent(bestSource.source)}&id=${encodeURIComponent(bestSource.id)}`,
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
          try {
            const detail = await fetchJson(
              `/api/detail?source=${encodeURIComponent(initialSource)}&id=${encodeURIComponent(initialId)}`,
            );

            setData((prev) => ({
              ...prev,
              detail,
              videoTitle: String(detail.title || initialTitle),
              videoYear: String(detail.year || initialYear),
              videoCover: String(detail.poster || ''),
              totalEpisodes: detail.episodes?.length || 0,
            }));
          } catch (detailErr) {
            // detail 失败，fallback 到搜索
            const fallbackTitle = searchTitle || initialTitle;
            if (fallbackTitle) {
              setLoadingStage('searching');
              const searchData = await fetchJson(
                `/api/search?q=${encodeURIComponent(fallbackTitle)}`,
              );
              const allResults = [
                ...(searchData?.regular_results ?? searchData?.results ?? []),
                ...(searchData?.adult_results ?? []),
              ];

              if (allResults.length > 0) {
                const best = allResults[0];
                setLoadingStage('fetching');
                const detail = await fetchJson(
                  `/api/detail?source=${encodeURIComponent(best.source)}&id=${encodeURIComponent(best.id)}`,
                );

                setData((prev) => ({
                  ...prev,
                  currentSource: best.source,
                  currentId: best.id,
                  detail,
                  videoTitle: String(detail.title || fallbackTitle),
                  videoYear: String(detail.year || initialYear),
                  videoCover: String(detail.poster || ''),
                  totalEpisodes: detail.episodes?.length || 0,
                }));
              } else {
                throw detailErr;
              }
            } else {
              throw detailErr;
            }
          }
        }

        setLoadingStage('ready');
        setLoading(false);
      } catch (err) {
        logError('加载视频数据失败', err);
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      }
    };

    loadVideoData();
  }, [fetchJson, initialSource, initialId, needPrefer, searchTitle]);

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
    loadingStage,
    error,
    updateEpisodeIndex,
    updateSource,
  };
}

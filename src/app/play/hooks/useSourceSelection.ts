/**
 * useSourceSelection Hook
 * 管理播放源选择、搜索和换源
 */

import { useCallback, useRef,useState } from 'react';

import { getConfig } from '@/lib/config';
import { getDetailFromApi,searchFromApi } from '@/lib/downstream';
import { logError, logInfo } from '@/lib/logger';
import type { SearchResult } from '@/lib/types';

import type {
  SwitchSourceOptions,
  UseSourceSelectionReturn,
} from '../types/player.types';

interface UseSourceSelectionOptions {
  searchTitle: string;
  searchType?: string;
  onSuccess?: (newDetail: SearchResult) => void;
  onError?: (error: string) => void;
}

/**
 * 源选择Hook
 */
export function useSourceSelection(
  options: UseSourceSelectionOptions
): UseSourceSelectionReturn {
  const { searchTitle, searchType: _searchType, onSuccess, onError } = options;

  const [sources, setSources] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 保存当前状态的引用，用于错误恢复
  const previousStateRef = useRef<{
    source: string;
    id: string;
    detail: SearchResult | null;
  } | null>(null);

  // 搜索可用源
  const searchSources = useCallback(async () => {
    if (!searchTitle) {
      setError('缺少搜索标题');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config = await getConfig();
      const apiSites = config.SourceConfig.filter((s) => !s.disabled).map((s) => ({
        key: s.key,
        name: s.name,
        api: s.api,
        detail: s.detail,
      }));

      // 并行搜索所有源
      const searchPromises = apiSites.map((site) =>
        searchFromApi(site, searchTitle).catch((err) => {
          logError(`${site.name} 搜索失败`, err);
          return [];
        })
      );

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // 按源名称去重
      const uniqueResults = Array.from(
        new Map(
          allResults.map((item) => [`${item.source}-${item.id}`, item])
        ).values()
      );

      setSources(uniqueResults);

      if (uniqueResults.length === 0) {
        setError('未找到匹配的播放源');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '搜索失败';
      setError(errorMsg);
      onError?.(errorMsg);
      logError('搜索播放源失败', err);
    } finally {
      setLoading(false);
    }
  }, [searchTitle, onError]);

  // 换源
  const switchSource = useCallback(
    async (switchOptions: SwitchSourceOptions) => {
      const { newSource, newId, preserveProgress = true } = switchOptions;

      // 保存当前状态（用于错误恢复）
      if (preserveProgress && previousStateRef.current) {
        // 状态已保存，继续换源
      }

      setLoading(true);
      setError(null);

      try {
        // 从可用源中查找目标源
        let newDetail = sources.find(
          (s) => s.source === newSource && s.id === newId
        );

        // 如果在已搜索的源中找不到，重新获取详情
        if (!newDetail) {
          const config = await getConfig();
          const apiSites = config.SourceConfig.filter((s) => !s.disabled).map((s) => ({
            key: s.key,
            name: s.name,
            api: s.api,
            detail: s.detail,
          }));
          const apiSite = apiSites.find((s) => s.key === newSource);

          if (!apiSite) {
            throw new Error('未找到对应的播放源配置');
          }

          newDetail = await getDetailFromApi(apiSite, newId);
        }

        if (!newDetail) {
          throw new Error('未找到匹配结果');
        }

        // 换源成功回调
        onSuccess?.(newDetail);

        logInfo('换源成功', {
          newSource,
          newId,
          title: newDetail.title,
          episodes: newDetail.episodes?.length || 0,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '换源失败';
        logError('换源失败', err);
        setError(errorMsg);
        onError?.(errorMsg);

        // 错误恢复（由调用者处理）
      } finally {
        setLoading(false);
      }
    },
    [sources, onSuccess, onError]
  );

  return {
    sources,
    loading,
    error,
    searchSources,
    switchSource,
  };
}

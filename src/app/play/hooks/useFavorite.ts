/**
 * useFavorite Hook
 * 管理收藏功能
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isFavorited,
  saveFavorite,
  deleteFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import type { UseFavoriteReturn } from '../types/player.types';

interface UseFavoriteOptions {
  source: string;
  id: string;
  title: string;
  year: string;
  poster: string;
  totalEpisodes: number;
}

/**
 * 收藏功能Hook
 */
export function useFavorite(options: UseFavoriteOptions): UseFavoriteReturn {
  const { source, id, title, year, poster, totalEpisodes } = options;

  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载收藏状态
  useEffect(() => {
    if (!source || !id) return;

    const loadFavoriteStatus = async () => {
      try {
        const status = await isFavorited(source, id);
        setFavorited(status);
      } catch (err) {
        console.error('读取收藏状态失败:', err);
      }
    };

    loadFavoriteStatus();

    // 订阅数据更新
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', () => {
      loadFavoriteStatus();
    });

    return unsubscribe;
  }, [source, id]);

  // 切换收藏状态
  const toggleFavorite = useCallback(async () => {
    if (!source || !id || loading) return;

    setLoading(true);
    try {
      if (favorited) {
        // 取消收藏
        await deleteFavorite(source, id);
        setFavorited(false);
      } else {
        // 添加收藏
        await saveFavorite(source, id, {
          source,
          id,
          title,
          year,
          poster,
          totalEpisodes,
          addedAt: Date.now(),
        });
        setFavorited(true);
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
    } finally {
      setLoading(false);
    }
  }, [source, id, title, year, poster, totalEpisodes, favorited, loading]);

  return {
    favorited,
    loading,
    toggleFavorite,
  };
}

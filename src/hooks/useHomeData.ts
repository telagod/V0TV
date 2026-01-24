'use client';

import { useCallback, useEffect, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import type { DoubanItem } from '@/lib/types';

interface UseHomeDataReturn {
  hotMovies: DoubanItem[];
  hotTvShows: DoubanItem[];
  hotVarietyShows: DoubanItem[];
  loading: boolean;
  loadingMore: {
    movies: boolean;
    tvShows: boolean;
    varietyShows: boolean;
  };
  hasMoreData: {
    movies: boolean;
    tvShows: boolean;
    varietyShows: boolean;
  };
  loadMoreMovies: () => Promise<void>;
  loadMoreTvShows: () => Promise<void>;
  loadMoreVarietyShows: () => Promise<void>;
}

export function useHomeData(): UseHomeDataReturn {
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 分页状态
  const [moviePage, setMoviePage] = useState(0);
  const [tvShowPage, setTvShowPage] = useState(0);
  const [varietyShowPage, setVarietyShowPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState({
    movies: false,
    tvShows: false,
    varietyShows: false,
  });
  const [hasMoreData, setHasMoreData] = useState({
    movies: true,
    tvShows: true,
    varietyShows: true,
  });

  // 初始加载
  useEffect(() => {
    const fetchDoubanData = async () => {
      try {
        setLoading(true);
        const [moviesData, tvShowsData, varietyShowsData] = await Promise.all([
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          }),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        ]);

        if (moviesData.code === 200) setHotMovies(moviesData.list);
        if (tvShowsData.code === 200) setHotTvShows(tvShowsData.list);
        if (varietyShowsData.code === 200)
          setHotVarietyShows(varietyShowsData.list);
      } catch {
        // 静默处理
      } finally {
        setLoading(false);
      }
    };

    fetchDoubanData();
  }, []);

  // 加载更多电影
  const loadMoreMovies = useCallback(async () => {
    if (loadingMore.movies || !hasMoreData.movies) return;

    setLoadingMore((prev) => ({ ...prev, movies: true }));
    try {
      const nextPage = moviePage + 1;
      const moviesData = await getDoubanCategories({
        kind: 'movie',
        category: '热门',
        type: '全部',
        pageStart: nextPage * 20,
        pageLimit: 20,
      });

      if (moviesData.code === 200 && moviesData.list.length > 0) {
        setHotMovies((prev) => [...prev, ...moviesData.list]);
        setMoviePage(nextPage);
        if (moviesData.list.length < 20) {
          setHasMoreData((prev) => ({ ...prev, movies: false }));
        }
      } else {
        setHasMoreData((prev) => ({ ...prev, movies: false }));
      }
    } catch {
      // 静默处理
    } finally {
      setLoadingMore((prev) => ({ ...prev, movies: false }));
    }
  }, [loadingMore.movies, hasMoreData.movies, moviePage]);

  // 加载更多剧集
  const loadMoreTvShows = useCallback(async () => {
    if (loadingMore.tvShows || !hasMoreData.tvShows) return;

    setLoadingMore((prev) => ({ ...prev, tvShows: true }));
    try {
      const nextPage = tvShowPage + 1;
      const tvShowsData = await getDoubanCategories({
        kind: 'tv',
        category: 'tv',
        type: 'tv',
        pageStart: nextPage * 20,
        pageLimit: 20,
      });

      if (tvShowsData.code === 200 && tvShowsData.list.length > 0) {
        setHotTvShows((prev) => [...prev, ...tvShowsData.list]);
        setTvShowPage(nextPage);
        if (tvShowsData.list.length < 20) {
          setHasMoreData((prev) => ({ ...prev, tvShows: false }));
        }
      } else {
        setHasMoreData((prev) => ({ ...prev, tvShows: false }));
      }
    } catch {
      // 静默处理
    } finally {
      setLoadingMore((prev) => ({ ...prev, tvShows: false }));
    }
  }, [loadingMore.tvShows, hasMoreData.tvShows, tvShowPage]);

  // 加载更多综艺
  const loadMoreVarietyShows = useCallback(async () => {
    if (loadingMore.varietyShows || !hasMoreData.varietyShows) return;

    setLoadingMore((prev) => ({ ...prev, varietyShows: true }));
    try {
      const nextPage = varietyShowPage + 1;
      const varietyShowsData = await getDoubanCategories({
        kind: 'tv',
        category: 'show',
        type: 'show',
        pageStart: nextPage * 20,
        pageLimit: 20,
      });

      if (varietyShowsData.code === 200 && varietyShowsData.list.length > 0) {
        setHotVarietyShows((prev) => [...prev, ...varietyShowsData.list]);
        setVarietyShowPage(nextPage);
        if (varietyShowsData.list.length < 20) {
          setHasMoreData((prev) => ({ ...prev, varietyShows: false }));
        }
      } else {
        setHasMoreData((prev) => ({ ...prev, varietyShows: false }));
      }
    } catch {
      // 静默处理
    } finally {
      setLoadingMore((prev) => ({ ...prev, varietyShows: false }));
    }
  }, [loadingMore.varietyShows, hasMoreData.varietyShows, varietyShowPage]);

  return {
    hotMovies,
    hotTvShows,
    hotVarietyShows,
    loading,
    loadingMore,
    hasMoreData,
    loadMoreMovies,
    loadMoreTvShows,
    loadMoreVarietyShows,
  };
}

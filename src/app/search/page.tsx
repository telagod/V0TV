/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  generateStorageKey,
  getAllPlayRecords,
  getSearchHistory,
  type PlayRecord,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import {
  getHostFromUrl,
  getHostScore,
  isHostLikelyDown,
  subscribeSourceHealthUpdated,
} from '@/lib/source-health';
import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

const RESULTS_PAGE_SIZE = 24;
const FAST_SITES = 4;

function SearchPageClient() {
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [playRecords, setPlayRecords] = useState<Record<string, PlayRecord>>(
    {},
  );
  const [hideUnhealthySources, setHideUnhealthySources] = useState(() => {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem('hideUnhealthySources');
    if (raw == null) return true;
    try {
      return Boolean(JSON.parse(raw));
    } catch {
      return true;
    }
  });
  const [healthTick, setHealthTick] = useState(0);

  // 分组结果状态
  const [groupedResults, setGroupedResults] = useState<{
    regular: SearchResult[];
    adult: SearchResult[];
  } | null>(null);

  // 分组标签页状态
  const [activeTab, setActiveTab] = useState<'regular' | 'adult'>('regular');

  const requestSeqRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);
  const lastFetchedQueryRef = useRef<string>('');
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);

  // 获取默认聚合设置：只读取用户本地设置，默认为 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 默认启用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });

  const normalizeResults = (results: SearchResult[]) => {
    const dedup = new Map<string, SearchResult>();
    for (const item of results) {
      if (!item?.id || !item?.source) continue;
      if (!item?.title?.trim()) continue;
      if (!item?.poster) continue;
      if (!Array.isArray(item.episodes) || item.episodes.length === 0) continue;
      if (typeof item.episodes[0] !== 'string' || !item.episodes[0]) continue;
      const key = `${item.source}-${item.id}`;
      if (!dedup.has(key)) dedup.set(key, item);
    }
    return Array.from(dedup.values());
  };

  // 聚合函数
  const aggregateResults = (results: SearchResult[]) => {
    const map = new Map<string, SearchResult[]>();
    results.forEach((item) => {
      // 使用 title + year + type 作为键
      const key = `${item.title.replaceAll(' ', '')}-${
        item.year || 'unknown'
      }-${item.episodes.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // 优先排序：标题与搜索词完全一致的排在前面
      const aExactMatch = a[1][0].title
        .replaceAll(' ', '')
        .includes(searchQuery.trim().replaceAll(' ', ''));
      const bExactMatch = b[1][0].title
        .replaceAll(' ', '')
        .includes(searchQuery.trim().replaceAll(' ', ''));

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 年份排序
      if (a[1][0].year === b[1][0].year) {
        return a[0].localeCompare(b[0]);
      } else {
        const aYear = a[1][0].year;
        const bYear = b[1][0].year;

        if (aYear === 'unknown' && bYear === 'unknown') {
          return 0;
        } else if (aYear === 'unknown') {
          return 1;
        } else if (bYear === 'unknown') {
          return -1;
        } else {
          return aYear > bYear ? -1 : 1;
        }
      }
    });
  };

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    if (!searchParams.get('q')) {
      document.getElementById('searchInput')?.focus();
    }

    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      },
    );

    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 事件驱动 + rAF 节流（避免常驻 rAF 轮询占用 CPU）
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setShowBackToTop(getScrollTop() > 300);
      });
    };

    // 初始计算一次
    handleScroll();

    document.body.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      document.body.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const fetchPlayRecords = async () => {
      try {
        const allRecords = await getAllPlayRecords();
        setPlayRecords(allRecords);
      } catch {
        setPlayRecords({});
      }
    };

    fetchPlayRecords();

    const unsubscribe = subscribeToDataUpdates(
      'playRecordsUpdated',
      (newRecords: Record<string, PlayRecord>) => {
        setPlayRecords(newRecords);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    return subscribeSourceHealthUpdated(() => {
      setHealthTick((t) => t + 1);
    });
  }, []);

  const getProgressInfoForItem = (item: SearchResult) => {
    const key = generateStorageKey(item.source, item.id);
    const record = playRecords[key];
    if (!record) return null;

    const progress =
      record.total_time > 0 ? (record.play_time / record.total_time) * 100 : 0;
    const clamped = Math.max(0, Math.min(progress, 100));
    const currentEpisode =
      typeof record.index === 'number' ? record.index + 1 : undefined;
    return { progress: clamped, currentEpisode, saveTime: record.save_time };
  };

  const getProgressInfoForGroup = (group: SearchResult[]) => {
    let best: ReturnType<typeof getProgressInfoForItem> = null;
    for (const item of group) {
      const info = getProgressInfoForItem(item);
      if (!info) continue;
      if (!best || info.saveTime > best.saveTime) best = info;
    }
    return best;
  };

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q');
    if (query) {
      const normalized = query.trim().replace(/\s+/g, ' ');
      setSearchQuery(normalized);

      if (normalized && normalized !== lastFetchedQueryRef.current) {
        lastFetchedQueryRef.current = normalized;
        fetchSearchResults(normalized);
      }

      // 保存到搜索历史 (事件监听会自动更新界面)
      addSearchHistory(query);
    } else {
      setShowResults(false);
    }
  }, [searchParams]);

  const fetchSearchResults = async (query: string) => {
    const currentSeq = ++requestSeqRef.current;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    try {
      setIsLoading(true);
      setIsCompleting(false);
      setShowResults(true);
      setVisibleCount(RESULTS_PAGE_SIZE);

      // 获取用户认证信息
      const authInfo = getAuthInfoFromBrowserCookie();

      // 构建请求头（服务端以 cookie 为准；这里仅用于兼容旧逻辑/调试）
      const headers: HeadersInit = {};
      if (authInfo?.username) {
        headers['Authorization'] = `Bearer ${authInfo.username}`;
      }

      const commonFetchOptions = {
        signal: controller.signal,
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      } as const;

      // Phase 1: fast search (limit sites) for quick first paint
      const fastResponse = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}&maxSites=${FAST_SITES}`,
        commonFetchOptions,
      );
      const fastData = await fastResponse.json().catch(() => ({}));

      if (currentSeq !== requestSeqRef.current) return;

      const fastRegular = Array.isArray(fastData?.regular_results)
        ? normalizeResults(fastData.regular_results)
        : [];
      const fastAdult = Array.isArray(fastData?.adult_results)
        ? normalizeResults(fastData.adult_results)
        : [];

      setGroupedResults({ regular: fastRegular, adult: fastAdult });
      setSearchResults([...fastRegular, ...fastAdult]);
      setIsLoading(false);

      // Phase 2: full search in background (non-blocking)
      setIsCompleting(true);
      const fullResponse = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`,
        commonFetchOptions,
      );
      const fullData = await fullResponse.json().catch(() => ({}));

      if (currentSeq !== requestSeqRef.current) return;

      const fullRegular = Array.isArray(fullData?.regular_results)
        ? normalizeResults(fullData.regular_results)
        : [];
      const fullAdult = Array.isArray(fullData?.adult_results)
        ? normalizeResults(fullData.adult_results)
        : [];

      // merge: keep stable ordering, prefer full payload
      const mergedRegular = normalizeResults([...fastRegular, ...fullRegular]);
      const mergedAdult = normalizeResults([...fastAdult, ...fullAdult]);

      setGroupedResults({ regular: mergedRegular, adult: mergedAdult });
      setSearchResults([...mergedRegular, ...mergedAdult]);
    } catch {
      if (controller.signal.aborted) return;
      setGroupedResults({ regular: [], adult: [] });
      setSearchResults([]);
    } finally {
      if (requestSeqRef.current === currentSeq) {
        setIsLoading(false);
        setIsCompleting(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 仅更新 URL，由参数变化触发实际请求（避免重复请求/阻塞）
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      // 根据调试结果，真正的滚动容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  const displayResults = useMemo(() => {
    if (groupedResults && groupedResults.adult.length > 0) {
      return activeTab === 'adult' ? groupedResults.adult : groupedResults.regular;
    }
    return searchResults;
  }, [searchResults, groupedResults, activeTab]);

  const healthRankedResults = useMemo(() => {
    const decorated = displayResults.map((item, index) => {
      const url = item.episodes?.[0] ?? '';
      const host = getHostFromUrl(url);
      const score = host ? getHostScore(host) : 0.6;
      const likelyDown = host ? isHostLikelyDown(host) : false;
      return { item, index, score, likelyDown };
    });

    const filtered = hideUnhealthySources
      ? decorated.filter((d) => !d.likelyDown)
      : decorated;

    filtered.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.index - b.index;
    });

    return filtered.map((d) => d.item);
  }, [displayResults, hideUnhealthySources, healthTick]);

  const aggregatedResults = useMemo(() => {
    if (viewMode !== 'agg') return null;
    return aggregateResults(healthRankedResults);
  }, [viewMode, healthRankedResults, searchQuery]);

  useEffect(() => {
    setVisibleCount(RESULTS_PAGE_SIZE);
  }, [activeTab, viewMode, searchQuery, hideUnhealthySources]);

  return (
    <PageLayout activePath='/search'>
      <div className='px-2 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8 overflow-visible mb-10'>
        {/* 搜索框 */}
        <div className='mb-6 sm:mb-8'>
          <form onSubmit={handleSearch} className='max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto'>
            <div className='relative'>
              <label htmlFor='searchInput' className='sr-only'>
                搜索电影、电视剧
              </label>
              <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
              <input
                id='searchInput'
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='搜索电影、电视剧...'
                className='w-full h-12 rounded-lg bg-gray-50/80 py-3 pl-10 pr-4 text-base text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white border border-gray-200/50 shadow-sm dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:bg-gray-700 dark:border-gray-700'
              />
            </div>
          </form>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className='w-full mx-auto mt-8 sm:mt-10 md:mt-12 overflow-visible'>
          {showResults ? (
            <section className='mb-12'>
              {/* 标题 + 聚合开关 */}
              <div className='mb-8 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    搜索结果
                  </h2>
                  {(isLoading || isCompleting) && (
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {isLoading ? '搜索中…' : '正在补全更多源…'}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-4'>
                  <label className='flex items-center gap-2 cursor-pointer select-none'>
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      过滤不可用源
                    </span>
                    <div className='relative'>
                      <input
                        type='checkbox'
                        className='sr-only peer'
                        checked={hideUnhealthySources}
                        onChange={() => {
                          const next = !hideUnhealthySources;
                          setHideUnhealthySources(next);
                          try {
                            window.localStorage.setItem(
                              'hideUnhealthySources',
                              JSON.stringify(next),
                            );
                          } catch {
                            // ignore
                          }
                          setVisibleCount(RESULTS_PAGE_SIZE);
                        }}
                      />
                      <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                      <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                    </div>
                  </label>

                  {/* 聚合开关 */}
                  <label className='flex items-center gap-2 cursor-pointer select-none'>
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      聚合
                    </span>
                    <div className='relative'>
                      <input
                        type='checkbox'
                        className='sr-only peer'
                        checked={viewMode === 'agg'}
                        onChange={() => {
                          setViewMode(viewMode === 'agg' ? 'all' : 'agg');
                          setVisibleCount(RESULTS_PAGE_SIZE);
                        }}
                      />
                      <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                      <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                    </div>
                  </label>
                </div>
              </div>

              {isLoading && searchResults.length === 0 && (
                <div className='flex justify-center items-center h-40'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
                </div>
              )}

              {/* 如果有分组结果且有成人内容，显示分组标签 */}
              {groupedResults && groupedResults.adult.length > 0 && (
                <div className='mb-6'>
                  <div className='flex items-center justify-center mb-4'>
                    <div className='inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg'>
                      <button
                        onClick={() => {
                          setActiveTab('regular');
                          setVisibleCount(RESULTS_PAGE_SIZE);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'regular'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        常规结果 ({groupedResults.regular.length})
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('adult');
                          setVisibleCount(RESULTS_PAGE_SIZE);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'adult'
                            ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        成人内容 ({groupedResults.adult.length})
                      </button>
                    </div>
                  </div>
                  {activeTab === 'adult' && (
                    <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md'>
                      <p className='text-sm text-red-600 dark:text-red-400 text-center'>
                        ⚠️ 以下内容可能包含成人资源，请确保您已年满18周岁
                      </p>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'agg' ? (
                <>
                  <div
                    key={`search-results-agg-${activeTab}`}
                    className='justify-start grid grid-cols-2 gap-x-3 gap-y-6 xs:grid-cols-3 xs:gap-x-3 xs:gap-y-8 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 md:grid-cols-4 md:gap-x-5 md:gap-y-12 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-14 xl:grid-cols-6 xl:gap-x-8 xl:gap-y-16 px-1 sm:px-2'
                  >
                    {(aggregatedResults ?? [])
                      .slice(0, visibleCount)
                      .map(([mapKey, group]: [string, SearchResult[]]) => {
                        const progressInfo = getProgressInfoForGroup(group);
                        return (
                          <div key={`agg-${mapKey}`} className='w-full'>
                            <VideoCard
                              from='search'
                              items={group}
                              progress={progressInfo?.progress}
                              currentEpisode={progressInfo?.currentEpisode}
                              query={
                                searchQuery.trim() !== group[0].title
                                  ? searchQuery.trim()
                                  : ''
                              }
                            />
                          </div>
                        );
                      })}
                    {(aggregatedResults ?? []).length === 0 && !isLoading && (
                      <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
                        未找到相关结果
                      </div>
                    )}
                  </div>
                  {(aggregatedResults ?? []).length > visibleCount && (
                    <div className='mt-8 flex justify-center'>
                      <button
                        type='button'
                        onClick={() =>
                          setVisibleCount((c) => c + RESULTS_PAGE_SIZE)
                        }
                        className='px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 transition-colors'
                      >
                        加载更多（已显示{' '}
                        {Math.min(visibleCount, (aggregatedResults ?? []).length)}{' '}
                        / {(aggregatedResults ?? []).length}）
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div
                    key={`search-results-all-${activeTab}`}
                    className='justify-start grid grid-cols-2 gap-x-3 gap-y-6 xs:grid-cols-3 xs:gap-x-3 xs:gap-y-8 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 md:grid-cols-4 md:gap-x-5 md:gap-y-12 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-14 xl:grid-cols-6 xl:gap-x-8 xl:gap-y-16 px-1 sm:px-2'
                  >
                    {healthRankedResults.slice(0, visibleCount).map((item) => {
                      const progressInfo = getProgressInfoForItem(item);
                      return (
                        <div
                          key={`all-${item.source}-${item.id}`}
                          className='w-full'
                        >
                          <VideoCard
                            id={item.id}
                            title={item.title}
                            poster={item.poster}
                            episodes={item.episodes.length}
                            source={item.source}
                            source_name={item.source_name}
                            douban_id={item.douban_id?.toString()}
                            progress={progressInfo?.progress}
                            currentEpisode={progressInfo?.currentEpisode}
                            query={
                              searchQuery.trim() !== item.title
                                ? searchQuery.trim()
                                : ''
                            }
                            year={item.year}
                            from='search'
                            type={item.episodes.length > 1 ? 'tv' : 'movie'}
                          />
                        </div>
                      );
                    })}
                    {healthRankedResults.length === 0 && !isLoading && (
                      <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
                        未找到相关结果
                      </div>
                    )}
                  </div>
                  {healthRankedResults.length > visibleCount && (
                    <div className='mt-8 flex justify-center'>
                      <button
                        type='button'
                        onClick={() => setVisibleCount((c) => c + RESULTS_PAGE_SIZE)}
                        className='px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 transition-colors'
                      >
                        加载更多（已显示 {Math.min(visibleCount, healthRankedResults.length)} / {healthRankedResults.length}）
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          ) : searchHistory.length > 0 ? (
            // 搜索历史
            <section className='mb-12'>
              <h2 className='mb-4 text-lg sm:text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
                搜索历史
                {searchHistory.length > 0 && (
                  <button
                    onClick={() => {
                      clearSearchHistory(); // 事件监听会自动更新界面
                    }}
                    className='ml-3 text-sm text-gray-600 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-500'
                  >
                    清空
                  </button>
                )}
              </h2>
              <div className='flex flex-wrap gap-2 sm:gap-3'>
                {searchHistory.map((item) => (
                  <div key={item} className='relative group'>
                    <button
                      onClick={() => {
                        setSearchQuery(item);
                        router.push(
                          `/search?q=${encodeURIComponent(item.trim())}`,
                        );
                      }}
                      className='px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500/10 hover:bg-gray-300 rounded-full text-xs sm:text-sm text-gray-700 transition-colors duration-200 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-300'
                    >
                      {item}
                    </button>
                    {/* 删除按钮 - 移动端增大触摸目标 */}
                    <button
                      aria-label='删除搜索历史'
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteSearchHistory(item); // 事件监听会自动更新界面
                      }}
                      className='absolute -top-1.5 -right-1.5 sm:-top-1 sm:-right-1 w-5 h-5 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed right-4 sm:right-6 z-fixed w-11 h-11 sm:w-12 sm:h-12 bg-green-500/90 hover:bg-green-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${
          showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          // 移动端：底部导航栏高度(56px) + 安全区 + 间距(16px)
          // 桌面端：固定 24px
          bottom: 'max(calc(4.5rem + env(safe-area-inset-bottom)), 1.5rem)',
        }}
        aria-label='返回顶部'
      >
        <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
      </button>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}

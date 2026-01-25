'use client';

/* eslint-disable @next/next/no-img-element */

import { AlertTriangle, Tv } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { SearchResult } from '@/lib/types';
import { getVideoResolutionFromM3u8, processImageUrl } from '@/lib/utils';

// 定义视频信息类型（包含基本信息和测速信息）
interface VideoInfo {
  // 基本信息（来自搜索结果）
  title?: string;
  year?: string;
  episodes?: number;

  // 测速信息（来自实时检测）
  quality: string;
  loadSpeed?: string;
  pingTime?: number;
  hasError?: boolean;
}

interface EpisodeSelectorProps {
  /** 总集数 */
  totalEpisodes: number;
  /** 每页显示多少集，默认 10 */
  episodesPerPage?: number;
  /** 当前选中的集数（1 开始） */
  value?: number;
  /** 用户点击选集后的回调 */
  onChange?: (episodeNumber: number) => void;
  /** 换源相关 */
  onSourceChange?: (source: string, id: string, title: string) => void;
  currentSource?: string;
  currentId?: string;
  videoTitle?: string;
  videoYear?: string;
  availableSources?: SearchResult[];
  sourceSearchLoading?: boolean;
  sourceSearchError?: string | null;
  /** 预计算的测速结果，避免重复测速 */
  precomputedVideoInfo?: Map<string, VideoInfo>;
}

/**
 * 选集组件，支持分页、自动滚动聚焦当前分页标签，以及换源功能。
 */
const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  totalEpisodes,
  episodesPerPage = 10,
  value = 1,
  onChange,
  onSourceChange,
  currentSource,
  currentId,
  videoTitle,
  availableSources = [],
  sourceSearchLoading = false,
  sourceSearchError = null,
  precomputedVideoInfo,
}) => {
  const router = useRouter();
  const pageCount = Math.ceil(totalEpisodes / episodesPerPage);

  // 存储每个源的视频信息
  const [videoInfoMap, setVideoInfoMap] = useState<Map<string, VideoInfo>>(
    new Map(),
  );
  const [attemptedSources, setAttemptedSources] = useState<Set<string>>(
    new Set(),
  );

  // 使用 ref 来避免闭包问题
  const attemptedSourcesRef = useRef<Set<string>>(new Set());
  const videoInfoMapRef = useRef<Map<string, VideoInfo>>(new Map());

  // 同步状态到 ref
  useEffect(() => {
    attemptedSourcesRef.current = attemptedSources;
  }, [attemptedSources]);

  useEffect(() => {
    videoInfoMapRef.current = videoInfoMap;
  }, [videoInfoMap]);

  // 主要的 tab 状态：'episodes' 或 'sources'
  // 当只有一集时默认展示 "换源"，并隐藏 "选集" 标签
  const [activeTab, setActiveTab] = useState<'episodes' | 'sources'>(
    totalEpisodes > 1 ? 'episodes' : 'sources',
  );

  // 当前分页索引（0 开始）
  const initialPage = Math.floor((value - 1) / episodesPerPage);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  // 是否倒序显示
  const [descending, setDescending] = useState<boolean>(false);

  const DEFAULT_SOURCE_TEST_LIMIT = 3;
  const SOURCE_TEST_BATCH = 3;
  const SOURCE_TEST_CONCURRENCY = 1;
  const [sourceTestLimit, setSourceTestLimit] = useState<number>(
    DEFAULT_SOURCE_TEST_LIMIT,
  );

  useEffect(() => {
    if (activeTab === 'sources') {
      setSourceTestLimit(
        Math.min(DEFAULT_SOURCE_TEST_LIMIT, availableSources.length),
      );
    }
  }, [activeTab, availableSources.length]);

  const sortedSources = React.useMemo(() => {
    const list = [...availableSources];
    list.sort((a, b) => {
      const aIsCurrent =
        a.source?.toString() === currentSource?.toString() &&
        a.id?.toString() === currentId?.toString();
      const bIsCurrent =
        b.source?.toString() === currentSource?.toString() &&
        b.id?.toString() === currentId?.toString();
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return 0;
    });
    return list;
  }, [availableSources, currentSource, currentId]);

  const testedInAutoLimit = React.useMemo(() => {
    const autoTargets = sortedSources.slice(0, sourceTestLimit);
    let count = 0;
    for (const source of autoTargets) {
      const key = `${source.source}-${source.id}`;
      if (videoInfoMap.has(key)) count++;
    }
    return count;
  }, [sortedSources, sourceTestLimit, videoInfoMap]);

  // 获取视频信息的函数
  const getVideoInfo = useCallback(
    async (source: SearchResult, signal?: AbortSignal) => {
      if (signal?.aborted) return;

      const sourceKey = `${source.source}-${source.id}`;

      // 使用 ref 获取最新的状态，避免闭包问题
      if (attemptedSourcesRef.current.has(sourceKey)) {
        return;
    }

    // 获取第一集的URL
    if (!source.episodes || source.episodes.length === 0) {
      return;
    }
    const episodeUrl =
      source.episodes.length > 1 ? source.episodes[1] : source.episodes[0];

    // 标记为已尝试
    attemptedSourcesRef.current.add(sourceKey);
    setAttemptedSources((prev) => new Set(prev).add(sourceKey));

    try {
      const info = await getVideoResolutionFromM3u8(episodeUrl, { signal });
      setVideoInfoMap((prev) => new Map(prev).set(sourceKey, info));
    } catch (error) {
      const err = error instanceof Error ? error : null;
      if (err?.name === 'AbortError') {
        attemptedSourcesRef.current.delete(sourceKey);
        setAttemptedSources((prev) => {
          const next = new Set(prev);
          next.delete(sourceKey);
          return next;
        });
        return;
      }

      // 失败时保存错误状态
      setVideoInfoMap((prev) =>
        new Map(prev).set(sourceKey, {
          quality: '错误',
          loadSpeed: '未知',
          pingTime: 0,
          hasError: true,
        }),
      );
    }
  },
    [],
  );

  // 当有预计算结果时，先合并到videoInfoMap中
  useEffect(() => {
    if (precomputedVideoInfo && precomputedVideoInfo.size > 0) {
      setVideoInfoMap((prev) => {
        const newMap = new Map(prev);
        precomputedVideoInfo.forEach((value, key) => {
          newMap.set(key, value);
        });
        return newMap;
      });

      setAttemptedSources((prev) => {
        const newSet = new Set(prev);
        precomputedVideoInfo.forEach((info, key) => {
          newSet.add(key);
        });
        return newSet;
      });
    }
  }, [precomputedVideoInfo]);

  // 当换源Tab激活且没有测速过时，开始测速
  useEffect(() => {
    if (
      activeTab !== 'sources' ||
      sourceSearchLoading ||
      sourceSearchError ||
      sortedSources.length === 0 ||
      sourceTestLimit <= 0
    ) {
      return;
    }

    const controller = new AbortController();
    const autoTargets = sortedSources.slice(0, sourceTestLimit);
    const pending = autoTargets.filter(
      (source) => !attemptedSourcesRef.current.has(`${source.source}-${source.id}`),
    );

    if (pending.length === 0) {
      return () => controller.abort();
    }

    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length && !controller.signal.aborted) {
        const source = pending[cursor++];
        await getVideoInfo(source, controller.signal);
      }
    };

    void Promise.all(
      Array.from({ length: SOURCE_TEST_CONCURRENCY }, () => worker()),
    );

    return () => controller.abort();
  }, [
    activeTab,
    sourceSearchLoading,
    sourceSearchError,
    sortedSources,
    sourceTestLimit,
    getVideoInfo,
  ]);

  // 分类标签容器和按钮的引用
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 自动滚动到当前分页标签
  useEffect(() => {
    if (categoryContainerRef.current && buttonRefs.current[currentPage]) {
      const container = categoryContainerRef.current;
      const button = buttonRefs.current[currentPage];

      if (button) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;

        if (buttonRect.left < containerRect.left) {
          container.scrollTo({
            left: scrollLeft - (containerRect.left - buttonRect.left) - 20,
            behavior: 'smooth',
          });
        } else if (buttonRect.right > containerRect.right) {
          container.scrollTo({
            left: scrollLeft + (buttonRect.right - containerRect.right) + 20,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [currentPage]);

  // 生成分页标签
  const categories = Array.from({ length: pageCount }, (_, i) => {
    const start = i * episodesPerPage + 1;
    const end = Math.min(start + episodesPerPage - 1, totalEpisodes);
    return start === end ? `${start}` : `${start}-${end}`;
  });

  // 处理换源tab点击，只在点击时才搜索
  const handleSourceTabClick = () => {
    setActiveTab('sources');
  };

  const handleCategoryClick = useCallback((index: number) => {
    setCurrentPage(index);
  }, []);

  const handleEpisodeClick = useCallback(
    (episodeNumber: number) => {
      onChange?.(episodeNumber);
    },
    [onChange],
  );

  const handleSourceClick = useCallback(
    (source: SearchResult) => {
      onSourceChange?.(source.source, source.id, source.title);
    },
    [onSourceChange],
  );

  const currentStart = currentPage * episodesPerPage + 1;
  const currentEnd = Math.min(
    currentStart + episodesPerPage - 1,
    totalEpisodes,
  );

  return (
    <div className='md:ml-2 px-4 py-0 h-full rounded-xl bg-bg-secondary flex flex-col border border-border-primary overflow-hidden'>
      {/* 主要的 Tab 切换 - 无缝融入设计 */}
      <div className='flex mb-0 -mx-6 flex-shrink-0'>
        {totalEpisodes > 1 && (
          <div
            onClick={() => setActiveTab('episodes')}
            className={`flex-1 py-3 px-6 text-center cursor-pointer transition-all duration-200 font-medium
                ${
                  activeTab === 'episodes'
                    ? 'text-brand'
                    : 'text-text-secondary hover:text-text-primary bg-bg-tertiary'
                }
            `.trim()}
          >
            选集
          </div>
        )}
        <div
          onClick={handleSourceTabClick}
          className={`flex-1 py-3 px-6 text-center cursor-pointer transition-all duration-200 font-medium
                ${
                  activeTab === 'sources'
                    ? 'text-brand'
                    : 'text-text-secondary hover:text-text-primary bg-bg-tertiary'
                }
            `.trim()}
        >
          换源
        </div>
      </div>

      {/* 选集 Tab 内容 */}
      {activeTab === 'episodes' && (
        <>
          {/* 分类标签 */}
          <div className='flex items-center gap-4 mb-2 border-b border-border-primary -mx-6 px-6 flex-shrink-0'>
            <div className='flex-1 overflow-x-auto' ref={categoryContainerRef}>
              <div className='flex gap-2 min-w-max'>
                {categories.map((label, idx) => {
                  const isActive = idx === currentPage;
                  return (
                    <button
                      key={label}
                      ref={(el) => {
                        buttonRefs.current[idx] = el;
                      }}
                      onClick={() => handleCategoryClick(idx)}
                      className={`w-20 relative py-2 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 text-center
                        ${
                          isActive
                            ? 'text-brand'
                            : 'text-text-secondary hover:text-text-primary'
                        }
                      `.trim()}
                    >
                      {label}
                      {isActive && (
                        <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-brand' />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 向上/向下按钮 */}
            <button
              className='flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors transform translate-y-[-4px]'
              onClick={() => {
                // 切换集数排序（正序/倒序）
                setDescending((prev) => !prev);
              }}
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'
                />
              </svg>
            </button>
          </div>

          {/* 集数网格 - 优化为10行×5列布局 */}
          <div className='grid grid-cols-5 gap-3 pb-6 px-2'>
            {(() => {
              const len = currentEnd - currentStart + 1;
              const episodes = Array.from({ length: len }, (_, i) =>
                descending ? currentEnd - i : currentStart + i,
              );
              return episodes;
            })().map((episodeNumber) => {
              const isActive = episodeNumber === value;
              return (
                <button
                  key={episodeNumber}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEpisodeClick(episodeNumber);
                  }}
                  className={`w-full h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
                    ${
                      isActive
                        ? 'bg-brand text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:scale-105'
                    }`.trim()}
                  type='button'
                >
                  {episodeNumber}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 换源 Tab 内容 */}
      {activeTab === 'sources' && (
        <div className='flex flex-col h-full mt-4'>
          {sourceSearchLoading && (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand'></div>
              <span className='ml-2 text-sm text-text-secondary'>
                搜索中...
              </span>
            </div>
          )}

          {sourceSearchError && (
            <div className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <AlertTriangle className='w-8 h-8 text-error mx-auto mb-2' />
                <p className='text-sm text-error'>
                  {sourceSearchError}
                </p>
              </div>
            </div>
          )}

          {!sourceSearchLoading &&
            !sourceSearchError &&
            availableSources.length === 0 && (
              <div className='flex items-center justify-center py-8'>
                <div className='text-center'>
                  <Tv className='w-8 h-8 text-text-tertiary mx-auto mb-2' />
                  <p className='text-sm text-text-secondary'>
                    暂无可用的换源
                  </p>
                </div>
              </div>
            )}

          {!sourceSearchLoading &&
            !sourceSearchError &&
            availableSources.length > 0 && (
              <div className='flex-1 flex flex-col min-h-0'>
                <div className='flex items-center justify-between px-1'>
                  <div className='text-xs text-text-tertiary'>
                    自动测速前 {Math.min(sourceTestLimit, sortedSources.length)}{' '}
                    个源（已完成 {testedInAutoLimit}/
                    {Math.min(sourceTestLimit, sortedSources.length)}）
                  </div>
                  {sortedSources.length > sourceTestLimit && (
                    <button
                      type='button'
                      onClick={() =>
                        setSourceTestLimit((prev) =>
                          Math.min(prev + SOURCE_TEST_BATCH, sortedSources.length),
                        )
                      }
                      className='text-xs text-text-tertiary hover:text-brand transition-colors'
                    >
                      测速更多
                    </button>
                  )}
                </div>

                <div className='flex-1 overflow-y-auto space-y-2 pb-20 mt-2'>
                  {sortedSources.map((source, index) => {
                    const isCurrentSource =
                      source.source?.toString() === currentSource?.toString() &&
                      source.id?.toString() === currentId?.toString();
                    return (
                      <div
                        key={`${source.source}-${source.id}`}
                        onClick={() =>
                          !isCurrentSource && handleSourceClick(source)
                        }
                        className={`flex items-start gap-3 px-2 py-3 rounded-lg transition-all select-none duration-200 relative
                          ${
                            isCurrentSource
                              ? 'bg-brand/10 border-brand/30 border'
                              : 'hover:bg-bg-hover hover:scale-[1.02] cursor-pointer'
                          }`.trim()}
                      >
                        {/* 封面 */}
                        <div className='flex-shrink-0 w-12 h-20 bg-bg-elevated rounded overflow-hidden'>
                          {source.episodes && source.episodes.length > 0 && (
                            <img
                              src={processImageUrl(source.poster)}
                              alt={source.title}
                              className='w-full h-full object-cover'
                              referrerPolicy='no-referrer'
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!source.poster) {
                                  target.style.display = 'none';
                                  return;
                                }

                                // Douban 热链失败时：自动回退到站内代理（仅重试一次，避免循环）
                                if (!target.dataset['fallbackApplied']) {
                                  try {
                                    const parsed = new URL(source.poster);
                                    const isDouban =
                                      parsed.hostname.endsWith('doubanio.com') ||
                                      parsed.hostname.endsWith('douban.com');
                                    if (isDouban) {
                                      target.dataset['fallbackApplied'] = '1';
                                      target.src = `/api/image-proxy?url=${encodeURIComponent(
                                        source.poster,
                                      )}`;
                                      return;
                                    }
                                  } catch {
                                    // ignore
                                  }
                                }

                                target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>

                        {/* 信息区域 */}
                        <div className='flex-1 min-w-0 flex flex-col justify-between h-20'>
                          {/* 标题和分辨率 - 顶部 */}
                          <div className='flex items-start justify-between gap-3 h-6'>
                            <div className='flex-1 min-w-0 relative group/title'>
                              <h3 className='font-medium text-base truncate text-text-primary leading-none'>
                                {source.title}
                              </h3>
                              {/* 标题级别的 tooltip - 第一个元素不显示 */}
                              {index !== 0 && (
                                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-bg-elevated text-text-primary text-xs rounded-md shadow-lg opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 ease-out delay-100 whitespace-nowrap z-tooltip pointer-events-none'>
                                  {source.title}
                                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-bg-elevated'></div>
                                </div>
                              )}
                            </div>
                            {(() => {
                              const sourceKey = `${source.source}-${source.id}`;
                              const videoInfo = videoInfoMap.get(sourceKey);
                              if (videoInfo && videoInfo.quality !== '未知') {
                                if (videoInfo.hasError) {
                                  return (
                                    <div className='bg-bg-tertiary text-error px-1.5 py-0 rounded text-xs flex-shrink-0 min-w-[50px] text-center'>
                                      检测失败
                                    </div>
                                  );
                                } else {
                                  const isUltraHigh = ['4K', '2K'].includes(
                                    videoInfo.quality,
                                  );
                                  const isHigh = ['1080p', '720p'].includes(
                                    videoInfo.quality,
                                  );
                                  const textColorClasses = isUltraHigh
                                    ? 'text-purple-400'
                                    : isHigh
                                      ? 'text-success'
                                      : 'text-warning';

                                  return (
                                    <div
                                      className={`bg-bg-tertiary ${textColorClasses} px-1.5 py-0 rounded text-xs flex-shrink-0 min-w-[50px] text-center`}
                                    >
                                      {videoInfo.quality}
                                    </div>
                                  );
                                }
                              }

                              if (attemptedSources.has(sourceKey)) {
                                return (
                                  <div className='bg-bg-tertiary text-text-secondary px-1.5 py-0 rounded text-xs flex-shrink-0 min-w-[50px] text-center'>
                                    测速中
                                  </div>
                                );
                              }

                              return null;
                            })()}
                          </div>

                          {/* 源名称和集数信息 - 垂直居中 */}
                          <div className='flex items-center justify-between'>
                            <span className='text-xs px-2 py-1 border border-border-primary rounded text-text-secondary'>
                              {source.source_name}
                            </span>
                            {source.episodes.length > 1 && (
                              <span className='text-xs text-text-tertiary font-medium'>
                                {source.episodes.length} 集
                              </span>
                            )}
                          </div>

                          {/* 网络信息 - 底部 */}
                          <div className='flex items-end h-6'>
                            {(() => {
                              const sourceKey = `${source.source}-${source.id}`;
                              const videoInfo = videoInfoMap.get(sourceKey);
                              if (videoInfo) {
                                if (!videoInfo.hasError) {
                                  return (
                                    <div className='flex items-end gap-3 text-xs'>
                                      <div className='text-success font-medium text-xs'>
                                        {videoInfo.loadSpeed}
                                      </div>
                                      <div className='text-warning font-medium text-xs'>
                                        {videoInfo.pingTime}ms
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className='text-error font-medium text-xs'>
                                      无测速数据
                                    </div>
                                  );
                                }
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className='flex-shrink-0 mt-auto pt-2 border-t border-border-primary'>
                    <button
                      onClick={() => {
                        if (videoTitle) {
                          router.push(
                            `/search?q=${encodeURIComponent(videoTitle)}`,
                          );
                        }
                      }}
                      className='w-full text-center text-xs text-text-tertiary hover:text-brand transition-colors py-2'
                    >
                      影片匹配有误？点击去搜索
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EpisodeSelector;

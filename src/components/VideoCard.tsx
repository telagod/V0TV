import { CheckCircle, Heart, Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  type Favorite,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
  type?: string;
}

export default function VideoCard({
  id,
  title = '',
  query = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  rate,
  items,
  type = '',
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;
    const countMap = new Map<string | number, number>();
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    const getMostFrequent = <T extends string | number>(
      map: Map<T, number>,
    ) => {
      let maxCount = 0;
      let result: T | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentDoubanId: getMostFrequent(countMap),
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = String(aggregateData?.first.title ?? title ?? '');
  const actualPoster = String(aggregateData?.first.poster ?? poster ?? '');
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualDoubanId = String(
    aggregateData?.mostFrequentDoubanId ?? douban_id ?? '',
  );
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = String(aggregateData?.first.year ?? year ?? '');
  const actualQuery = String(query ?? '');
  const actualSearchType = isAggregate
    ? aggregateData?.first.episodes?.length === 1
      ? 'movie'
      : 'tv'
    : type;

  const initialImageSrc = useMemo(
    () => processImageUrl(actualPoster),
    [actualPoster],
  );
  const [imageSrc, setImageSrc] = useState(initialImageSrc);

  useEffect(() => {
    setIsLoading(false);
    setImageSrc(initialImageSrc);
  }, [initialImageSrc]);

  const getDoubanProxyFallback = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      const isDouban =
        parsed.hostname.endsWith('doubanio.com') ||
        parsed.hostname.endsWith('douban.com');
      if (!isDouban) return null;
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    } catch {
      return null;
    }
  };

  // 获取收藏状态
  useEffect(() => {
    if (from === 'douban' || !actualSource || !actualId) return;

    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setFavorited(fav);
      } catch {
        // ignore
      }
    };

    fetchFavoriteStatus();

    // 监听收藏状态更新事件
    const storageKey = generateStorageKey(actualSource, actualId);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, Favorite>) => {
        // 检查当前项目是否在新的收藏列表中
        const isNowFavorited = !!newFavorites[storageKey];
        setFavorited(isNowFavorited);
      },
    );

    return unsubscribe;
  }, [from, actualSource, actualId]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from === 'douban' || !actualSource || !actualId) return;
      try {
        if (favorited) {
          // 如果已收藏，删除收藏
          await deleteFavorite(actualSource, actualId);
          setFavorited(false);
        } else {
          // 如果未收藏，添加收藏
          await saveFavorite(actualSource, actualId, {
            title: actualTitle,
            source_name: source_name || '',
            year: actualYear || '',
            cover: actualPoster,
            total_episodes: actualEpisodes ?? 1,
            save_time: Date.now(),
          });
          setFavorited(true);
        }
      } catch {
        // ignore
      }
    },
    [
      from,
      actualSource,
      actualId,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
      favorited,
    ],
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from !== 'playrecord' || !actualSource || !actualId) return;
      try {
        await deletePlayRecord(actualSource, actualId);
        onDelete?.();
      } catch {
        // ignore
      }
    },
    [from, actualSource, actualId, onDelete],
  );

  const handleClick = useCallback(() => {
    if (from === 'douban') {
      router.push(
        `/play?title=${encodeURIComponent(actualTitle.trim())}${
          actualYear ? `&year=${actualYear}` : ''
        }${
          actualSearchType ? `&stype=${actualSearchType}` : ''
        }&prefer=true&stitle=${encodeURIComponent(actualTitle.trim())}`,
      );
    } else if (actualSource && actualId) {
      router.push(
        `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle,
        )}${actualYear ? `&year=${actualYear}` : ''}${
          isAggregate ? '&prefer=true' : ''
        }${
          actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`,
      );
    }
  }, [
    from,
    actualSource,
    actualId,
    router,
    actualTitle,
    actualYear,
    isAggregate,
    actualQuery,
    actualSearchType,
  ]);

  const config = useMemo(() => {
    const configs = {
      playrecord: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: true,
        showDoubanLink: false,
        showRating: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: false,
        showDoubanLink: false,
        showRating: false,
      },
      search: {
        showSourceName: true,
        showProgress: true,
        showPlayButton: true,
        showHeart: !isAggregate,
        showCheckCircle: false,
        showDoubanLink: !!actualDoubanId,
        showRating: false,
      },
      douban: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        showDoubanLink: true,
        showRating: !!rate,
      },
    };
    return configs[from] || configs.search;
  }, [from, isAggregate, actualDoubanId, rate]);

  return (
    <div
      className='group relative w-full cursor-pointer'
      onClick={handleClick}
    >
      {/* 海报容器 — 锐利圆角，电影感 */}
      <div className='relative aspect-[2/3] overflow-hidden rounded-sm bg-surface-secondary'>
        {/* 骨架屏 */}
        {!isLoading && <ImagePlaceholder aspectRatio='aspect-[2/3]' />}
        {/* 图片 — 慢缩放，降亮 */}
        <Image
          src={imageSrc}
          alt={actualTitle}
          fill
          sizes='(max-width: 475px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 20vw, 11rem'
          className='object-cover transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:brightness-[0.6]'
          referrerPolicy='no-referrer'
          onLoadingComplete={() => setIsLoading(true)}
          onError={() => {
            const fallback = getDoubanProxyFallback(actualPoster);
            if (!fallback) return;
            if (imageSrc === fallback) return;
            setIsLoading(false);
            setImageSrc(fallback);
          }}
        />

        {/* 播放按钮 — 圆形玻璃 */}
        {config.showPlayButton && (
          <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500'>
            <div className='w-12 h-12 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-sm bg-white/10'>
              <PlayCircleIcon
                size={24}
                strokeWidth={1.5}
                className='text-white ml-0.5'
              />
            </div>
          </div>
        )}

        {/* 操作按钮 — hover 时浮现 */}
        {(config.showHeart || config.showCheckCircle) && (
          <div className='absolute bottom-3 right-3 flex gap-1.5 opacity-0 transition-all duration-500 group-hover:opacity-100'>
            {config.showCheckCircle && (
              <button
                type='button'
                onClick={handleDeleteRecord}
                className='w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-all duration-300'
                aria-label='标记为已看'
              >
                <CheckCircle size={14} className='text-white/80' />
              </button>
            )}
            {config.showHeart && (
              <button
                type='button'
                onClick={handleToggleFavorite}
                className='w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-all duration-300'
                aria-label={favorited ? '取消收藏' : '添加收藏'}
              >
                <Heart
                  size={14}
                  className={`transition-colors duration-300 ${
                    favorited
                      ? 'fill-accent stroke-accent'
                      : 'fill-transparent stroke-white/80 hover:stroke-accent'
                  }`}
                />
              </button>
            )}
          </div>
        )}

        {/* 评分 — hover 时显示，文字形态 */}
        {config.showRating && rate && (
          <div className='absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500'>
            <span className='text-xs font-sans text-accent tracking-wider'>
              {rate}
            </span>
          </div>
        )}

        {/* 集数 — 右上角，克制 */}
        {actualEpisodes && actualEpisodes > 1 && (
          <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500'>
            <span className='text-[10px] font-sans text-content-secondary tracking-wider'>
              {currentEpisode
                ? `${currentEpisode}/${actualEpisodes}`
                : `${actualEpisodes}集`}
            </span>
          </div>
        )}

        {/* 豆瓣链接 — hover 时显示 */}
        {config.showDoubanLink && actualDoubanId && (
          <a
            href={`https://movie.douban.com/subject/${actualDoubanId}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='absolute bottom-3 left-3 opacity-0 transition-all duration-500 group-hover:opacity-100'
          >
            <div className='w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors duration-300'>
              <Link size={12} className='text-white/80' />
            </div>
          </a>
        )}
      </div>

      {/* 进度条 — 纤细 */}
      {config.showProgress && typeof progress === 'number' && progress > 0 && (
        <div className='mt-2'>
          <div className='h-[2px] w-full bg-white/[0.06] rounded-full overflow-hidden'>
            <div
              className='h-full bg-accent/60 transition-all duration-700'
              style={{
                width: `${Math.max(0, Math.min(progress, 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 标题与来源 — 衬线标题 */}
      <div className='mt-3 space-y-1'>
        <h3 className='font-serif text-sm text-content-primary truncate tracking-wide leading-tight'>
          {actualTitle}
        </h3>
        {config.showSourceName && source_name && (
          <p className='text-[11px] text-content-tertiary font-sans font-light tracking-wider'>
            {source_name}
          </p>
        )}
      </div>
    </div>
  );
}

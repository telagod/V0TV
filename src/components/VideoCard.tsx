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

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualDoubanId = String(
    aggregateData?.mostFrequentDoubanId ?? douban_id,
  );
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = aggregateData?.first.year ?? year;
  const actualQuery = query || '';
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
      className='group relative w-full cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:z-[500]'
      onClick={handleClick}
    >
      {/* 海报容器 */}
      <div className='relative aspect-[2/3] overflow-hidden rounded-md bg-surface-elevated'>
        {/* 骨架屏 */}
        {!isLoading && <ImagePlaceholder aspectRatio='aspect-[2/3]' />}
        {/* 图片 */}
        <Image
          src={imageSrc}
          alt={actualTitle}
          fill
          sizes='(max-width: 475px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 20vw, 11rem'
          className='object-cover transition-opacity duration-300 group-hover:opacity-40'
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

        {/* 悬浮遮罩 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />

        {/* 播放按钮 */}
        {config.showPlayButton && (
          <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100'>
            <PlayCircleIcon
              size={50}
              strokeWidth={0.8}
              className='text-white fill-transparent transition-all duration-300 hover:fill-brand hover:scale-110'
            />
          </div>
        )}

        {/* 操作按钮 */}
        {(config.showHeart || config.showCheckCircle) && (
          <div className='absolute bottom-2 right-2 flex gap-1 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0'>
            {config.showCheckCircle && (
              <button
                type='button'
                onClick={handleDeleteRecord}
                className='w-10 h-10 flex items-center justify-center rounded-full bg-surface-elevated/80 hover:bg-surface-hover transition-all duration-200'
                aria-label='标记为已看'
              >
                <CheckCircle size={18} className='text-content-primary hover:text-success' />
              </button>
            )}
            {config.showHeart && (
              <button
                type='button'
                onClick={handleToggleFavorite}
                className='w-10 h-10 flex items-center justify-center rounded-full bg-surface-elevated/80 hover:bg-surface-hover transition-all duration-200'
                aria-label={favorited ? '取消收藏' : '添加收藏'}
              >
                <Heart
                  size={18}
                  className={`transition-colors duration-200 ${
                    favorited
                      ? 'fill-brand stroke-brand'
                      : 'fill-transparent stroke-content-primary hover:stroke-brand'
                  }`}
                />
              </button>
            )}
          </div>
        )}

        {/* 评分徽章 */}
        {config.showRating && rate && (
          <div className='absolute top-2 right-2 bg-brand text-white text-xs font-bold px-1.5 py-0.5 rounded'>
            {rate}
          </div>
        )}

        {/* 集数徽章 */}
        {actualEpisodes && actualEpisodes > 1 && (
          <div className='absolute top-2 right-2 bg-surface-elevated/90 text-content-primary text-xs font-medium px-2 py-0.5 rounded'>
            {currentEpisode
              ? `${currentEpisode}/${actualEpisodes}`
              : `${actualEpisodes}集`}
          </div>
        )}

        {/* 豆瓣链接 */}
        {config.showDoubanLink && actualDoubanId && (
          <a
            href={`https://movie.douban.com/subject/${actualDoubanId}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='absolute top-2 left-2 opacity-0 transition-all duration-300 group-hover:opacity-100'
          >
            <div className='bg-success text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center hover:bg-success/80 transition-colors'>
              <Link size={14} />
            </div>
          </a>
        )}
      </div>

      {/* 进度条 */}
      {config.showProgress && typeof progress === 'number' && progress > 0 && (
        <div className='mt-1.5'>
          <div className='h-0.5 w-full bg-surface-hover rounded-full overflow-hidden'>
            <div
              className='h-full bg-brand transition-all duration-500'
              style={{
                width: `${Math.max(0, Math.min(progress, 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 标题与来源 */}
      <div className='mt-2'>
        <h3 className='text-sm font-medium text-content-primary truncate group-hover:text-content-secondary transition-colors'>
          {actualTitle}
        </h3>
        {config.showSourceName && source_name && (
          <p className='text-xs text-content-tertiary mt-0.5 truncate'>
            {source_name}
          </p>
        )}
      </div>
    </div>
  );
}

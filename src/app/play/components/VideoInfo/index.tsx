/**
 * VideoInfo 组件
 * 视频信息展示（标题、封面、简介等）
 */

'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import type { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import { FavoriteButton } from './FavoriteButton';

interface VideoInfoProps {
  /** 视频标题 */
  title: string;
  /** 年份 */
  year?: string;
  /** 封面图片 */
  cover?: string;
  /** 视频详情 */
  detail?: SearchResult | null;
  /** 是否已收藏 */
  favorited?: boolean;
  /** 收藏加载中 */
  favoriteLoading?: boolean;
  /** 收藏按钮点击回调 */
  onToggleFavorite?: () => void;
  /** 自定义className */
  className?: string;
}

/**
 * 视频信息组件
 */
export function VideoInfo(props: VideoInfoProps) {
  const {
    title,
    year,
    cover,
    detail,
    favorited = false,
    favoriteLoading = false,
    onToggleFavorite,
    className = '',
  } = props;

  const initialCoverSrc = useMemo(
    () => (cover ? processImageUrl(cover) : ''),
    [cover],
  );
  const [coverSrc, setCoverSrc] = useState(initialCoverSrc);

  useEffect(() => {
    setCoverSrc(initialCoverSrc);
  }, [initialCoverSrc]);

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

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
      {/* 文字区 */}
      <div className='md:col-span-3'>
        <div className='p-6 flex flex-col min-h-0'>
          {/* 标题 */}
          <h1 className='text-3xl font-bold mb-2 tracking-wide flex items-center flex-shrink-0 text-center md:text-left w-full'>
            {title || '影片标题'}
            {onToggleFavorite && (
              <FavoriteButton
                favorited={favorited}
                loading={favoriteLoading}
                onClick={onToggleFavorite}
                className='ml-3'
              />
            )}
          </h1>

          {/* 关键信息行 */}
          <div className='flex flex-wrap items-center gap-3 text-base mb-4 opacity-80 flex-shrink-0'>
            {detail?.class && (
              <span className='text-green-600 font-semibold'>
                {detail.class}
              </span>
            )}
            {(detail?.year || year) && <span>{detail?.year || year}</span>}
            {detail?.source_name && (
              <span className='border border-gray-500/60 px-2 py-[1px] rounded'>
                {detail.source_name}
              </span>
            )}
            {detail?.type_name && <span>{detail.type_name}</span>}
          </div>

          {/* 剧情简介 */}
          {detail?.desc && (
            <div
              className='mt-0 text-base leading-relaxed opacity-90 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide'
              style={{ whiteSpace: 'pre-line' }}
            >
              {detail.desc}
            </div>
          )}
        </div>
      </div>

      {/* 封面展示 */}
      <div className='hidden md:block md:col-span-1 md:order-first'>
        <div className='pl-0 py-4 pr-6'>
          <div className='relative bg-gray-300 dark:bg-gray-700 aspect-[2/3] flex items-center justify-center rounded-xl overflow-hidden'>
            {cover ? (
              <Image
                src={coverSrc}
                alt={title}
                fill
                sizes='(min-width: 768px) 20vw, 50vw'
                className='object-cover'
                priority
                referrerPolicy='no-referrer'
                onError={() => {
                  const fallback = getDoubanProxyFallback(cover);
                  if (!fallback) return;
                  if (coverSrc === fallback) return;
                  setCoverSrc(fallback);
                }}
              />
            ) : (
              <span className='text-gray-600 dark:text-gray-400'>封面图片</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

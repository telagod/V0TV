'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { useHomeData } from '@/hooks/useHomeData';

import ContinueWatching from '@/components/ContinueWatching';
import PaginatedRow from '@/components/PaginatedRow';
import { BottomLogo } from '@/components/ui/Logo';
import { createVideoSkeletons } from '@/components/ui/Skeleton';
import VideoCard from '@/components/VideoCard';

interface MediaSectionProps {
  title: string;
  href: string;
  children: React.ReactNode;
}

function MediaSection({ title, href, children }: MediaSectionProps) {
  return (
    <section className='mb-8'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
          {title}
        </h2>
        <Link
          href={href}
          className='flex items-center text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'
        >
          查看更多
          <ChevronRight className='w-4 h-4 ml-1' />
        </Link>
      </div>
      {children}
    </section>
  );
}

export default function HomeContent() {
  const {
    hotMovies,
    hotTvShows,
    hotVarietyShows,
    loading,
    loadingMore,
    hasMoreData,
    loadMoreMovies,
    loadMoreTvShows,
    loadMoreVarietyShows,
  } = useHomeData();

  return (
    <>
      {/* 继续观看 */}
      <ContinueWatching />

      {/* 热门电影 */}
      <MediaSection title='热门电影' href='/douban?type=movie'>
        <PaginatedRow
          itemsPerPage={10}
          onLoadMore={loadMoreMovies}
          hasMoreData={hasMoreData.movies}
          isLoading={loadingMore.movies}
        >
          {loading
            ? createVideoSkeletons(10)
            : hotMovies.map((movie, index) => (
                <div key={index} className='w-full'>
                  <VideoCard
                    from='douban'
                    title={movie.title}
                    poster={movie.poster}
                    douban_id={movie.id}
                    rate={movie.rate}
                    year={movie.year}
                    type='movie'
                  />
                </div>
              ))}
        </PaginatedRow>
      </MediaSection>

      {/* 热门剧集 */}
      <MediaSection title='热门剧集' href='/douban?type=tv'>
        <PaginatedRow
          itemsPerPage={10}
          onLoadMore={loadMoreTvShows}
          hasMoreData={hasMoreData.tvShows}
          isLoading={loadingMore.tvShows}
        >
          {loading
            ? createVideoSkeletons(10)
            : hotTvShows.map((show, index) => (
                <div key={index} className='w-full'>
                  <VideoCard
                    from='douban'
                    title={show.title}
                    poster={show.poster}
                    douban_id={show.id}
                    rate={show.rate}
                    year={show.year}
                  />
                </div>
              ))}
        </PaginatedRow>
      </MediaSection>

      {/* 热门综艺 */}
      <MediaSection title='热门综艺' href='/douban?type=show'>
        <PaginatedRow
          itemsPerPage={10}
          onLoadMore={loadMoreVarietyShows}
          hasMoreData={hasMoreData.varietyShows}
          isLoading={loadingMore.varietyShows}
        >
          {loading
            ? createVideoSkeletons(10)
            : hotVarietyShows.map((show, index) => (
                <div key={index} className='w-full'>
                  <VideoCard
                    from='douban'
                    title={show.title}
                    poster={show.poster}
                    douban_id={show.id}
                    rate={show.rate}
                    year={show.year}
                  />
                </div>
              ))}
        </PaginatedRow>
      </MediaSection>

      {/* 首页底部 Logo */}
      <BottomLogo />
    </>
  );
}

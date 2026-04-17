'use client';

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
    <section className='mb-16 lg:mb-20'>
      <div className='mb-6 lg:mb-8 flex items-end justify-between'>
        <div>
          <h2 className='font-serif text-2xl lg:text-3xl text-content-primary tracking-wide'>
            {title}
          </h2>
          <div className='mt-2 w-8 h-px bg-accent/40' />
        </div>
        <Link
          href={href}
          className='text-xs text-content-tertiary hover:text-accent tracking-[0.2em] uppercase font-sans transition-colors duration-300'
        >
          查看更多
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

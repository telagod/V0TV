'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-purple-200 dark:bg-purple-800 rounded ${className}`}
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <div className='w-full'>
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-purple-200 animate-pulse dark:bg-purple-800'>
        <div className='absolute inset-0 bg-purple-300 dark:bg-purple-700'></div>
      </div>
      <div className='mt-2 h-4 bg-purple-200 rounded animate-pulse dark:bg-purple-800'></div>
    </div>
  );
}

// 返回骨架屏数组，用于 PaginatedRow
export function createVideoSkeletons(count = 10): React.ReactNode[] {
  return Array.from({ length: count }).map((_, index) => (
    <VideoCardSkeleton key={`skeleton-${index}`} />
  ));
}

// 兼容旧用法的组件
export function VideoRowSkeleton({ count = 10 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <VideoCardSkeleton key={index} />
      ))}
    </>
  );
}

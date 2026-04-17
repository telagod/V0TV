'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-tertiary rounded ${className}`}
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <div className='w-full'>
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface-tertiary animate-pulse'>
        <div className='absolute inset-0 bg-surface-elevated'></div>
      </div>
      <div className='mt-2 h-4 bg-surface-tertiary rounded animate-pulse'></div>
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

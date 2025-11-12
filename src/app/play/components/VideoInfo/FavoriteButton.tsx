/**
 * FavoriteButton 组件
 * 收藏按钮
 */

'use client';

import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  /** 是否已收藏 */
  favorited: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 自定义className */
  className?: string;
}

/**
 * 收藏按钮组件
 */
export function FavoriteButton(props: FavoriteButtonProps) {
  const { favorited, loading = false, onClick, className = '' } = props;

  return (
    <button
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={loading}
      className={`flex-shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50 ${className}`}
      title={favorited ? '取消收藏' : '添加收藏'}
    >
      {favorited ? <FilledHeart /> : <OutlineHeart />}
    </button>
  );
}

/**
 * 填充的心形图标（已收藏）
 */
function FilledHeart() {
  return (
    <svg
      className='h-7 w-7'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
        fill='#ef4444' /* Tailwind red-500 */
        stroke='#ef4444'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

/**
 * 轮廓心形图标（未收藏）
 */
function OutlineHeart() {
  return (
    <Heart className='h-7 w-7 stroke-[1] text-gray-600 dark:text-gray-300' />
  );
}

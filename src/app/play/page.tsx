/**
 * Play Page - 重构版本
 * 使用最佳实践，清晰的职责分离
 */

import { Suspense } from 'react';
import PlayPageClient from './PlayPageClient';
import PageLayout from '@/components/PageLayout';

// 强制动态渲染（因为使用了 useSearchParams）
export const dynamic = 'force-dynamic';

/**
 * 播放页面（服务端入口）
 */
export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <PageLayout activePath='/play'>
          <div className='flex items-center justify-center min-h-screen'>
            <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent' />
          </div>
        </PageLayout>
      }
    >
      <PlayPageClient />
    </Suspense>
  );
}

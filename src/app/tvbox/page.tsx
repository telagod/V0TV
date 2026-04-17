'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function TVBoxPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到新的配置页面
    router.replace('/config');
  }, [router]);

  return (
    <div className='min-h-screen bg-surface-primary flex items-center justify-center'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4'></div>
        <p className='text-content-secondary'>
          正在跳转到配置页面...
        </p>
      </div>
    </div>
  );
}

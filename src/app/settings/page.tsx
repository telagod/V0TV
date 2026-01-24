'use client';

import { ArrowLeft, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

import AdultContentFilter from '@/components/AdultContentFilter';
import PageLayout from '@/components/PageLayout';

export default function UserSettingsPage() {
  const router = useRouter();
  const [authInfo, setAuthInfo] = useState<{ userName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthInfoFromBrowserCookie();
    if (!auth || !auth.username) {
      // 如果用户未登录，重定向到登录页面
      router.push('/login');
      return;
    }
    setAuthInfo({ userName: auth.username });
    setIsLoading(false);
  }, [router]);

  const handleFilterUpdate = (_enabled: boolean) => {
    // 可以在这里添加一些全局状态更新或通知逻辑
    // console.log('成人内容过滤状态已更新:', enabled);
  };

  if (isLoading) {
    return (
      <PageLayout activePath='/settings'>
        <div className='flex items-center justify-center min-h-[40vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-green-500'></div>
        </div>
      </PageLayout>
    );
  }

  if (!authInfo) {
    return null;
  }

  return (
    <PageLayout activePath='/settings'>
      {/* 页面头部 */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-4'>
          <button
            onClick={() => router.back()}
            className='mt-0.5 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/70 border border-gray-200/70 dark:border-gray-700/70 hover:bg-white dark:hover:bg-gray-800 transition-colors'
            aria-label='返回'
            type='button'
          >
            <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-300' />
          </button>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center'>
              <Settings className='w-7 h-7 mr-3 text-green-600 dark:text-green-400' />
              用户设置
            </h1>
            <p className='text-gray-600 dark:text-gray-400 mt-2'>
              管理您的个人偏好与隐私选项
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-gray-800/70 rounded-lg border border-gray-200/70 dark:border-gray-700/70 w-fit'>
          <User className='w-5 h-5 text-gray-600 dark:text-gray-300' />
          <span className='text-sm font-medium text-gray-900 dark:text-white'>
            {authInfo.userName}
          </span>
        </div>
      </div>

      {/* 设置区域 */}
      <div className='mt-8 space-y-8'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            内容过滤
          </h2>
          <AdultContentFilter
            userName={authInfo.userName}
            onUpdate={handleFilterUpdate}
          />
        </div>

        <div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            其他设置
          </h2>
          <div className='rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70 p-6'>
            <p className='text-gray-500 dark:text-gray-400 text-center py-6'>
              更多设置选项即将推出...
            </p>
          </div>
        </div>

        <div className='text-center text-sm text-gray-500 dark:text-gray-400'>
          <p>设置会自动保存并在设备间同步</p>
        </div>
      </div>
    </PageLayout>
  );
}

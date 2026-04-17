'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { checkForUpdates, CURRENT_VERSION, UpdateStatus } from '@/lib/version';

import IOSCompatibility from '@/components/IOSCompatibility';
import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

// 版本显示组件
function VersionDisplay() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const status = await checkForUpdates();
        setUpdateStatus(status);
      } catch {
        // do nothing
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdate();
  }, []);

  return (
    <button
      onClick={() =>
        window.open(
          process.env.NEXT_PUBLIC_REPO_URL || 'https://github.com/telagod/V0TV',
          '_blank',
        )
      }
      className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-xs text-content-tertiary transition-colors cursor-pointer'
    >
      <span className='font-mono'>v{CURRENT_VERSION}</span>
      {!isChecking && updateStatus !== UpdateStatus.FETCH_FAILED && (
        <div
          className={`flex items-center gap-1.5 ${
            updateStatus === UpdateStatus.HAS_UPDATE
              ? 'text-accent'
              : updateStatus === UpdateStatus.NO_UPDATE
                ? 'text-accent'
                : ''
          }`}
        >
          {updateStatus === UpdateStatus.HAS_UPDATE && (
            <>
              <AlertCircle className='w-3.5 h-3.5' />
              <span className='font-semibold text-xs'>有新版本</span>
            </>
          )}
          {updateStatus === UpdateStatus.NO_UPDATE && (
            <>
              <CheckCircle className='w-3.5 h-3.5' />
              <span className='font-semibold text-xs'>已是最新</span>
            </>
          )}
        </div>
      )}
    </button>
  );
}

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldAskUsername, setShouldAskUsername] = useState(false);
  const [enableRegister, setEnableRegister] = useState(false);
  const { siteName } = useSite();

  // 在客户端挂载后设置配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageType = window.RUNTIME_CONFIG?.STORAGE_TYPE;
      setShouldAskUsername(
        Boolean(storageType && storageType !== 'localstorage'),
      );
      setEnableRegister(Boolean(window.RUNTIME_CONFIG?.ENABLE_REGISTER));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password || (shouldAskUsername && !username)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername ? { username } : {}),
        }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else if (res.status === 401) {
        setError('密码错误');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册逻辑
  const handleRegister = async () => {
    setError(null);
    if (!password || !username) return;

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IOSCompatibility>
      <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-surface-primary'>
        {/* Subtle decorative elements */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute top-1/4 left-1/4 w-32 h-32 bg-accent-muted rounded-full blur-xl'></div>
          <div className='absolute bottom-1/4 right-1/4 w-40 h-40 bg-accent-muted rounded-full blur-xl'></div>
        </div>

        <div className='absolute top-4 right-4'>
          <ThemeToggle />
        </div>

        <div className='relative z-10 w-full max-w-md rounded-3xl bg-surface-primary/75 backdrop-blur-2xl shadow-2xl p-10 border border-white/[0.04]'>
          {/* Logo */}
          <h1 className='text-center text-3xl font-serif font-extrabold mb-8'>
            <span className='text-content-primary'>
              {siteName}
            </span>
          </h1>

          <form onSubmit={handleSubmit} className='space-y-8'>
            {shouldAskUsername && (
              <div>
                <label htmlFor='username' className='sr-only'>
                  用户名
                </label>
                <input
                  id='username'
                  type='text'
                  autoComplete='username'
                  className='block w-full rounded-lg border py-3 px-4 text-content-primary shadow-sm ring-0 border-stroke-primary placeholder:text-content-tertiary focus:ring-1 focus:ring-accent/40 focus:outline-none sm:text-base bg-surface-tertiary'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <label htmlFor='password' className='sr-only'>
                密码
              </label>
              <input
                id='password'
                type='password'
                autoComplete='current-password'
                className='block w-full rounded-lg border py-3 px-4 text-content-primary shadow-sm ring-0 border-stroke-primary placeholder:text-content-tertiary focus:ring-1 focus:ring-accent/40 focus:outline-none sm:text-base bg-surface-tertiary'
                placeholder='输入访问密码'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className='text-sm text-error'>{error}</p>
            )}

            {/* 登录 / 注册按钮 */}
            {shouldAskUsername && enableRegister ? (
              <div className='flex gap-4'>
                <button
                  type='button'
                  onClick={handleRegister}
                  disabled={!password || !username || loading}
                  className='flex-1 inline-flex justify-center rounded-lg bg-accent hover:bg-accent-hover py-3 text-base font-sans font-light text-surface-primary shadow-lg transition-all duration-700 ease-in-out hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {loading ? '注册中...' : '注册'}
                </button>
                <button
                  type='submit'
                  disabled={
                    !password || loading || (shouldAskUsername && !username)
                  }
                  className='flex-1 inline-flex justify-center rounded-lg bg-accent hover:bg-accent-hover py-3 text-base font-sans font-light text-surface-primary shadow-lg transition-all duration-700 ease-in-out hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </div>
            ) : (
              <button
                type='submit'
                disabled={
                  !password || loading || (shouldAskUsername && !username)
                }
                className='inline-flex w-full justify-center rounded-lg bg-accent hover:bg-accent-hover py-3 text-base font-sans font-light text-surface-primary shadow-lg transition-all duration-700 ease-in-out hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
              >
                {loading ? '登录中...' : '登录'}
              </button>
            )}
          </form>
        </div>

        {/* 版本信息显示 */}
        <VersionDisplay />
      </div>
    </IOSCompatibility>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}

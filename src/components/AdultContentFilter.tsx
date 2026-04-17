'use client';

import { Shield, ShieldOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { logError, logInfo, logWarn } from '@/lib/logger';

interface AdultContentFilterProps {
  userName?: string;
  onUpdate?: (enabled: boolean) => void;
}

const AdultContentFilter: React.FC<AdultContentFilterProps> = ({
  userName,
  onUpdate,
}) => {
  const [isEnabled, setIsEnabled] = useState(true); // 默认开启过滤
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageType =
    typeof window !== 'undefined'
      ? ((window as unknown as { RUNTIME_CONFIG?: { STORAGE_TYPE?: string } })
          .RUNTIME_CONFIG?.STORAGE_TYPE ?? 'localstorage')
      : 'localstorage';

  const authHeaders = useMemo<HeadersInit>(() => {
    // 生产环境（D1/Upstash/Redis…）以 cookie 为准；仅 localstorage 兼容旧 Authorization
    if (storageType === 'localstorage' && userName) {
      return { Authorization: `Bearer ${userName}` } as HeadersInit;
    }
    return {} as HeadersInit;
  }, [storageType, userName]);

  // 获取用户设置
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (storageType === 'localstorage' && !userName) return;

      try {
        const response = await fetch('/api/user/settings', {
          headers: authHeaders,
        });

        if (response.ok) {
          const data = await response.json();
          setIsEnabled(data.settings.filter_adult_content);
        } else {
          setError('获取用户设置失败');
        }
      } catch (err) {
        setError('网络连接失败');
        logError('Failed to fetch user settings', err);
      }
    };

    fetchUserSettings();
  }, [userName, storageType, authHeaders]);

  // 更新用户设置
  const handleToggle = async () => {
    if ((storageType === 'localstorage' && !userName) || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          settings: {
            filter_adult_content: !isEnabled,
          },
        }),
      });

      if (response.ok) {
        const newState = !isEnabled;
        setIsEnabled(newState);

        // 刷新用户设置缓存 - 使用专用API
        try {
          await fetch('/api/user/refresh-cache', {
            method: 'POST',
            headers: authHeaders,
          });
          logInfo('[成人内容过滤] 缓存刷新成功');
        } catch (refreshError) {
          // 缓存刷新失败不影响设置更新
          logWarn('[成人内容过滤] 缓存刷新失败', refreshError);
        }

        onUpdate?.(newState);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新设置失败');
      }
    } catch (err) {
      setError('网络连接失败');
      logError('Failed to update user settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='bg-surface-tertiary rounded-lg shadow-sm border border-stroke-primary p-6'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center space-x-3'>
          <div className='flex items-center justify-center w-10 h-10 rounded-full bg-accent-muted'>
            {isEnabled ? (
              <Shield className='w-5 h-5 text-accent' />
            ) : (
              <ShieldOff className='w-5 h-5 text-content-tertiary' />
            )}
          </div>
          <div className='flex-1'>
            <h3 className='text-lg font-medium text-content-primary'>
              成人内容过滤
            </h3>
            <p className='text-sm text-content-tertiary mt-1'>
              {isEnabled
                ? '已开启过滤，将自动隐藏所有标记为"成人"的资源站及其内容'
                : '已关闭过滤，成人内容将在搜索结果中单独分组显示'}
            </p>
          </div>
        </div>

        <div className='flex items-center space-x-3'>
          <button
            onClick={handleToggle}
            disabled={isLoading || (storageType === 'localstorage' && !userName)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-surface-primary disabled:opacity-50 disabled:cursor-not-allowed
              ${isEnabled ? 'bg-accent' : 'bg-surface-hover'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>

          {isLoading && (
            <div className='w-5 h-5'>
              <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-accent'></div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className='mt-4 p-3 bg-error/10 border border-error/20 rounded-md'>
          <p className='text-sm text-error'>{error}</p>
        </div>
      )}

      <div className='mt-4 p-4 bg-accent-muted border border-accent/20 rounded-md'>
        <div className='flex items-start'>
          <div className='flex-shrink-0'>
            <Shield className='w-5 h-5 text-accent' />
          </div>
          <div className='ml-3'>
            <h4 className='text-sm font-medium text-accent'>
              安全提示
            </h4>
            <p className='mt-1 text-sm text-accent/80'>
              为了确保良好的使用体验和遵守相关法规，建议保持成人内容过滤开启。如需访问相关内容，请确保您已年满18周岁并承担相应法律责任。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdultContentFilter;

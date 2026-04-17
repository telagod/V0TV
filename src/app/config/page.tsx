'use client';

import { useCallback, useState } from 'react';

import PageLayout from '@/components/PageLayout';

export const dynamic = 'force-dynamic';

export default function ConfigPage() {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'json' | 'base64'>('json');

  const getConfigUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/tvbox?format=${format}`;
  }, [format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getConfigUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed silently
    }
  };

  return (
    <PageLayout activePath='/config'>
      <h1 className='text-2xl sm:text-3xl font-bold text-content-primary mb-8'>
        TVBox 配置
      </h1>

      <div className='rounded-xl bg-surface-secondary/70 border border-stroke-primary p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4 text-content-primary'>
          配置链接
        </h2>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-content-secondary mb-2'>
            格式类型
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'json' | 'base64')}
            className='w-full p-2 border border-stroke-secondary rounded-md bg-surface-tertiary text-content-primary'
          >
            <option value='json'>JSON 格式</option>
            <option value='base64'>Base64 格式</option>
          </select>
        </div>

        <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
          <input
            type='text'
            readOnly
            value={getConfigUrl()}
            className='flex-1 p-3 border border-stroke-secondary rounded-md bg-surface-tertiary text-content-primary font-mono text-sm'
          />
          <button
            onClick={handleCopy}
            className={`px-4 py-3 rounded-md font-medium transition-colors ${
              copied
                ? 'bg-accent text-surface-primary'
                : 'bg-accent hover:bg-accent-hover text-surface-primary'
            }`}
            type='button'
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      <div className='rounded-xl bg-surface-secondary/70 border border-stroke-primary p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4 text-content-primary'>
          使用说明
        </h2>

        <div className='space-y-4 text-content-secondary'>
          <div>
            <h3 className='font-semibold mb-2'>1. 获取配置链接</h3>
            <p>复制上方的配置链接，支持 JSON 和 Base64 两种格式。</p>
          </div>

          <div>
            <h3 className='font-semibold mb-2'>2. 导入 TVBox</h3>
            <p>打开 TVBox 应用，在配置管理中添加接口配置，粘贴链接。</p>
          </div>

          <div>
            <h3 className='font-semibold mb-2'>3. 开始使用</h3>
            <p>配置导入成功后，即可在 TVBox 中浏览和观看本站内容。</p>
          </div>
        </div>
      </div>

      <div className='rounded-xl bg-surface-secondary/70 border border-stroke-primary p-6'>
        <h2 className='text-lg font-semibold mb-4 text-content-primary'>
          支持功能
        </h2>

        <div className='grid md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <h3 className='font-semibold text-content-primary'>
              视频解析
            </h3>
            <ul className='text-sm text-content-secondary space-y-1'>
              <li>• 支持多种视频源</li>
              <li>• 自动解析视频链接</li>
              <li>• 高清视频播放</li>
            </ul>
          </div>

          <div className='space-y-2'>
            <h3 className='font-semibold text-content-primary'>
              兼容性
            </h3>
            <ul className='text-sm text-content-secondary space-y-1'>
              <li>• 完全兼容 TVBox</li>
              <li>• 支持自定义配置</li>
              <li>• 实时更新内容</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

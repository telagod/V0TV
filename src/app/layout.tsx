import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

// import { Inter } from 'next/font/google';
import './globals.css';

import { BRAND_CONTACT, BRAND_NAME } from '@/lib/brand';
import { getConfig } from '@/lib/config';

import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';

import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';

// const inter = Inter({ subsets: ['latin'] });

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  const defaultSiteName = process.env.SITE_NAME || BRAND_NAME;
  const useRuntimeConfig =
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'd1' &&
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash';
  const resolvedSiteName = useRuntimeConfig
    ? (await getConfig()).SiteConfig.SiteName
    : defaultSiteName;

  return {
    title: resolvedSiteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
};

const SW_DISABLE_SNIPPET = `
(() => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations?.().then((regs) => {
    regs.forEach((reg) => reg.unregister().catch(() => {}));
  });
})();
`.trim();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaultSiteName = process.env.SITE_NAME || BRAND_NAME;
  const defaultAnnouncement =
    process.env.ANNOUNCEMENT ||
    `本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。${BRAND_CONTACT}`;
  const defaultEnableRegister =
    process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true';
  const defaultImageProxy = process.env.NEXT_PUBLIC_IMAGE_PROXY || '';
  const defaultDoubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  const shouldLoadConfig =
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'd1' &&
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash';

  const resolvedConfig = shouldLoadConfig ? await getConfig() : null;
  const siteName = resolvedConfig?.SiteConfig.SiteName || defaultSiteName;
  const announcement =
    resolvedConfig?.SiteConfig.Announcement || defaultAnnouncement;
  const enableRegister =
    resolvedConfig?.UserConfig.AllowRegister ?? defaultEnableRegister;
  const imageProxy = resolvedConfig?.SiteConfig.ImageProxy || defaultImageProxy;
  const doubanProxy =
    resolvedConfig?.SiteConfig.DoubanProxy || defaultDoubanProxy;

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    ENABLE_REGISTER: enableRegister,
    IMAGE_PROXY: imageProxy,
    DOUBAN_PROXY: doubanProxy,
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
        {/* 禁用/清理已安装的 Service Worker（最小化 worker 开销） */}
        <script dangerouslySetInnerHTML={{ __html: SW_DISABLE_SNIPPET }} />
      </head>
      <body className='min-h-screen bg-surface-primary text-content-primary font-sans'>
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          forcedTheme='dark'
          disableTransitionOnChange
        >
          <ConfirmDialogProvider>
            <SiteProvider siteName={siteName} announcement={announcement}>
              {children}
            </SiteProvider>
          </ConfirmDialogProvider>
          <Toaster richColors position='top-center' />
        </ThemeProvider>
      </body>
    </html>
  );
}

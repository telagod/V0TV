'use client';

import { Clover, Film, Home, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BackButton } from './BackButton';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

// 内联顶部导航栏组件
const TopNavbar = ({ activePath = '/' }: { activePath?: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { siteName } = useSite();

  const [active, setActive] = useState(activePath);

  useEffect(() => {
    // 优先使用传入的 activePath（本项目页面通常显式传入）
    setActive(activePath || pathname);
  }, [activePath, pathname]);

  const handleSearchClick = useCallback(() => {
    router.push('/search');
  }, [router]);

  const menuItems = [
    {
      icon: Home,
      label: '首页',
      href: '/',
    },
    {
      icon: Search,
      label: '搜索',
      href: '/search',
    },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
    },
  ];

  // 桌面端：顶部固定导航（fixed）
  // 移动端：不显示此组件，改由底部导航 + 轻量顶部条（非固定）
  return (
    <nav
      className='w-full bg-white/40 backdrop-blur-xl border-b border-purple-200/50 shadow-lg dark:bg-gray-900/70 dark:border-purple-700/50 fixed top-0 left-0 right-0 z-fixed hidden md:block'
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className='w-full px-8 lg:px-12 xl:px-16'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo区域 - 调整为更靠左 */}
          <div className='flex-shrink-0 -ml-2'>
            <Link
              href='/'
              className='flex items-center select-none hover:opacity-80 transition-opacity duration-200'
            >
              <span className='text-2xl font-bold v0tv-logo tracking-tight'>
                {siteName}
              </span>
            </Link>
          </div>

          {/* 导航菜单 */}
          <div className='hidden md:block'>
            <div className='ml-10 flex items-baseline space-x-4'>
              {menuItems.map((item) => {
                // 检查当前路径是否匹配这个菜单项
                const typeMatch = item.href.match(/type=([^&]+)/)?.[1];
                const tagMatch = item.href.match(/tag=([^&]+)/)?.[1];

                // 解码URL以进行正确的比较
                const decodedActive = decodeURIComponent(active);
                const decodedItemHref = decodeURIComponent(item.href);

                const isActive =
                  decodedActive === decodedItemHref ||
                  (decodedActive.startsWith('/douban') &&
                    decodedActive.includes(`type=${typeMatch}`) &&
                    tagMatch &&
                    decodedActive.includes(`tag=${tagMatch}`));

                const Icon = item.icon;

                if (item.href === '/search') {
                  return (
                    <button
                      key={item.label}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSearchClick();
                        setActive('/search');
                      }}
                      data-active={isActive}
                      className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                          : 'text-gray-700 hover:bg-purple-100/30 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-purple-500/10'
                      }`}
                    >
                      <Icon className='h-4 w-4 mr-2' />
                      {item.label}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActive(item.href)}
                    data-active={isActive}
                    className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                        : 'text-gray-700 hover:bg-purple-100/30 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-purple-500/10'
                    }`}
                  >
                    <Icon className='h-4 w-4 mr-2' />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 右侧按钮 - 调整为更靠右，增加间距实现对称效果 */}
          <div className='flex items-center gap-3 -mr-2'>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  const isPlayPage = activePath === '/play';

  return (
    <div
      className='w-full min-h-screen'
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* 移动端头部 (fixed) */}
      <MobileHeader showBackButton={isPlayPage} />

      {/* 桌面端顶部导航栏 (fixed) */}
      <TopNavbar activePath={activePath} />

      {/* 主内容区域 - 预留桌面端顶部导航高度 64px */}
      <div className='relative min-w-0 transition-all duration-300 md:pt-16'>
        {/* 桌面端左上角返回按钮 */}
        {isPlayPage && (
          <div className='absolute top-3 left-1 z-sticky hidden md:flex'>
            <BackButton />
          </div>
        )}

        {/* 主内容容器 - 为播放页面使用特殊布局（83.33%宽度），其他页面使用默认布局（66.67%宽度） */}
        <main className='mb-14 md:mb-0 md:px-6 lg:px-8'>
          <div
            className='w-full min-h-[calc(100vh-4rem)]'
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            <div
              className={`w-full mx-auto rounded-container ${
                isPlayPage ? 'max-w-[1200px]' : 'max-w-6xl'
              }`}
            >
              <div className='p-3 xs:p-4 sm:p-6 md:p-8 lg:p-10'>{children}</div>
            </div>
          </div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;

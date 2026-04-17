'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BackButton } from './BackButton';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { useSite } from './SiteProvider';
import { UserMenu } from './UserMenu';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

// 顶部导航栏 — 奢侈品风纯文字导航
const TopNavbar = ({ activePath = '/' }: { activePath?: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { siteName } = useSite();
  const [scrolled, setScrolled] = useState(false);

  const [active, setActive] = useState(activePath);

  useEffect(() => {
    setActive(activePath || pathname);
  }, [activePath, pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchClick = useCallback(() => {
    router.push('/search');
  }, [router]);

  const menuItems = [
    { label: '首页', href: '/' },
    { label: '搜索', href: '/search' },
    { label: '电影', href: '/douban?type=movie' },
    { label: '剧集', href: '/douban?type=tv' },
    { label: '综艺', href: '/douban?type=show' },
  ];

  return (
    <nav
      className={`w-full fixed top-0 left-0 right-0 z-fixed hidden md:block transition-all duration-500 ${
        scrolled ? 'glass-nav' : 'bg-transparent'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className='w-full px-8 lg:px-16'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo — 衬线体 */}
          <div className='flex-shrink-0'>
            <Link
              href='/'
              className='flex items-center select-none hover:opacity-80 transition-opacity duration-500'
            >
              <span className='v0tv-logo text-lg'>
                {siteName}
              </span>
            </Link>
          </div>

          {/* 导航菜单 — 纯文字，大写，字距宽 */}
          <div className='hidden md:block'>
            <div className='flex items-center gap-8'>
              {menuItems.map((item) => {
                const typeMatch = item.href.match(/type=([^&]+)/)?.[1];
                const decodedActive = decodeURIComponent(active);
                const decodedItemHref = decodeURIComponent(item.href);

                const isActive =
                  decodedActive === decodedItemHref ||
                  (decodedActive.startsWith('/douban') &&
                    typeMatch &&
                    decodedActive.includes(`type=${typeMatch}`));

                if (item.href === '/search') {
                  return (
                    <button
                      key={item.label}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSearchClick();
                        setActive('/search');
                      }}
                      className={`text-xs tracking-[0.15em] uppercase font-sans transition-colors duration-300 ${
                        isActive
                          ? 'text-content-primary'
                          : 'text-content-tertiary hover:text-content-secondary'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActive(item.href)}
                    className={`text-xs tracking-[0.15em] uppercase font-sans transition-colors duration-300 ${
                      isActive
                        ? 'text-content-primary'
                        : 'text-content-tertiary hover:text-content-secondary'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 右侧用户菜单 */}
          <div className='flex items-center gap-3'>
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
      className='w-full min-h-screen bg-surface-primary'
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* 移动端头部 */}
      <MobileHeader showBackButton={isPlayPage} />

      {/* 桌面端顶部导航栏 */}
      <TopNavbar activePath={activePath} />

      {/* 主内容区域 */}
      <div className='relative min-w-0 transition-all duration-300 md:pt-16'>
        {/* 桌面端左上角返回按钮 */}
        {isPlayPage && (
          <div className='absolute top-3 left-1 z-sticky hidden md:flex'>
            <BackButton />
          </div>
        )}

        {/* 主内容容器 — 宽边距，呼吸感 */}
        <main className='mb-14 md:mb-0 px-4 md:px-8 lg:px-12 xl:px-16'>
          <div
            className='w-full min-h-[calc(100vh-4rem)]'
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            <div
              className={`w-full mx-auto ${
                isPlayPage ? 'max-w-[1200px]' : 'max-w-[1400px]'
              }`}
            >
              {children}
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

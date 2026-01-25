'use client';

import { Clover, Film, Home, Search, Tv } from 'lucide-react';
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

// 顶部导航栏组件 - Netflix 风格
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
    { icon: Home, label: '首页', href: '/' },
    { icon: Search, label: '搜索', href: '/search' },
    { icon: Film, label: '电影', href: '/douban?type=movie' },
    { icon: Tv, label: '剧集', href: '/douban?type=tv' },
    { icon: Clover, label: '综艺', href: '/douban?type=show' },
  ];

  return (
    <nav
      className={`w-full fixed top-0 left-0 right-0 z-fixed hidden md:block transition-colors duration-300 ${
        scrolled ? 'bg-surface-primary' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className='w-full px-8 lg:px-12 xl:px-16'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <div className='flex-shrink-0 -ml-2'>
            <Link
              href='/'
              className='flex items-center select-none hover:opacity-80 transition-opacity duration-200'
            >
              <span className='text-xl font-bold text-content-primary tracking-tight'>
                {siteName}
              </span>
            </Link>
          </div>

          {/* 导航菜单 */}
          <div className='hidden md:block'>
            <div className='ml-10 flex items-baseline space-x-1'>
              {menuItems.map((item) => {
                const typeMatch = item.href.match(/type=([^&]+)/)?.[1];
                const decodedActive = decodeURIComponent(active);
                const decodedItemHref = decodeURIComponent(item.href);

                const isActive =
                  decodedActive === decodedItemHref ||
                  (decodedActive.startsWith('/douban') &&
                    typeMatch &&
                    decodedActive.includes(`type=${typeMatch}`));

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
                      className={`group flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'text-content-primary'
                          : 'text-content-secondary hover:text-content-primary'
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
                    className={`group flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-content-primary'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    <Icon className='h-4 w-4 mr-2' />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 右侧用户菜单 */}
          <div className='flex items-center gap-3 -mr-2'>
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

        {/* 主内容容器 */}
        <main className='mb-14 md:mb-0 md:px-6 lg:px-8'>
          <div
            className='w-full min-h-[calc(100vh-4rem)]'
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            <div
              className={`w-full mx-auto ${
                isPlayPage ? 'max-w-[1200px]' : 'max-w-6xl'
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

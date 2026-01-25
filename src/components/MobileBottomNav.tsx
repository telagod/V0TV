'use client';

import { Clover, Film, Home, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileBottomNavProps {
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const currentActive = activePath ?? pathname;

  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    { icon: Search, label: '搜索', href: '/search' },
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

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-fixed bg-bg-primary border-t border-border-primary'
      style={{
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className='flex items-center'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className='flex-shrink-0 w-1/5'>
              <Link
                href={item.href}
                className='flex flex-col items-center justify-center w-full h-14 mobile-landscape:h-11 gap-1 mobile-landscape:gap-0.5 text-xs transition-all duration-200 relative'
              >
                {/* 激活状态红色下划线 */}
                {active && (
                  <div className='absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand rounded-full'></div>
                )}

                <item.icon
                  className={`h-6 w-6 mobile-landscape:h-5 mobile-landscape:w-5 transition-colors duration-200 ${
                    active
                      ? 'text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                />
                <span
                  className={`transition-colors duration-200 font-medium mobile-landscape:text-[10px] ${
                    active
                      ? 'text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;

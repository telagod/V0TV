'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header
      className='md:hidden relative w-full bg-white/70 backdrop-blur-xl border-b border-purple-200/50 shadow-sm dark:bg-gray-900/70 dark:border-purple-700/50'
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className='h-12 mobile-landscape:h-10 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
          <Link
            href='/'
            className='text-lg mobile-landscape:text-base font-bold v0tv-logo tracking-tight hover:opacity-80 transition-opacity'
          >
            {siteName}
          </Link>
        </div>
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;

'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header
      className='md:hidden relative w-full bg-bg-primary border-b border-border-primary'
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className='h-12 mobile-landscape:h-10 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
          <Link
            href='/'
            className='text-lg mobile-landscape:text-base font-bold text-text-primary tracking-tight hover:opacity-80 transition-opacity'
          >
            {siteName}
          </Link>
        </div>
        <div className='flex items-center gap-2'>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;

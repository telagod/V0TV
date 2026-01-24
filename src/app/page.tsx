'use client';

import { Suspense, useEffect, useState } from 'react';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import AnnouncementModal from '@/components/features/Announcement';
import FavoritesContent from '@/components/features/FavoritesContent';
import HomeContent from '@/components/features/HomeContent';
import PageLayout from '@/components/PageLayout';
import { useSite } from '@/components/SiteProvider';
import { MainLogo } from '@/components/ui/Logo';

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const { announcement } = useSite();

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  const handleCloseAnnouncement = () => {
    setShowAnnouncement(false);
  };

  return (
    <PageLayout>
      <div className='px-4 sm:px-8 lg:px-12 py-4 sm:py-8 overflow-visible'>
        {/* 主内容区大型 V0TV Logo - 仅在首页显示 */}
        {activeTab === 'home' && <MainLogo />}

        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        {/* 主内容区域 */}
        <div className='w-full max-w-none mx-auto'>
          {activeTab === 'favorites' ? <FavoritesContent /> : <HomeContent />}
        </div>
      </div>

      {/* 公告弹窗 */}
      {announcement && showAnnouncement && (
        <AnnouncementModal
          announcement={announcement}
          onClose={handleCloseAnnouncement}
        />
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}

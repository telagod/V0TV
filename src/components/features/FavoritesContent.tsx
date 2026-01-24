'use client';

import { useEffect, useState } from 'react';

import {
  clearAllFavorites,
  type Favorite,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import { BottomLogo } from '@/components/ui/Logo';
import VideoCard from '@/components/VideoCard';

interface FavoriteItem {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
}

export default function FavoritesContent() {
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  // 处理收藏数据更新
  const updateFavoriteItems = async (
    allFavorites: Record<string, Favorite>,
  ) => {
    const allPlayRecords = await getAllPlayRecords();

    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
        } as FavoriteItem;
      });

    setFavoriteItems(sorted);
  };

  // 加载收藏数据
  useEffect(() => {
    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    // 监听收藏更新事件
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, Favorite>) => {
        updateFavoriteItems(newFavorites);
      },
    );

    return unsubscribe;
  }, []);

  const handleClearAll = async () => {
    await clearAllFavorites();
    setFavoriteItems([]);
  };

  return (
    <>
      <section className='mb-8'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
            我的收藏
          </h2>
          {favoriteItems.length > 0 && (
            <button
              className='text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'
              onClick={handleClearAll}
            >
              清空
            </button>
          )}
        </div>

        <div className='grid grid-cols-2 xs:grid-cols-3 gap-x-2 gap-y-10 sm:gap-y-16 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-6 lg:gap-x-8 justify-items-center'>
          {favoriteItems.map((item) => (
            <div key={item.id + item.source} className='w-full max-w-44'>
              <VideoCard
                query={item.search_title}
                {...item}
                from='favorite'
                type={item.episodes > 1 ? 'tv' : ''}
              />
            </div>
          ))}
          {favoriteItems.length === 0 && (
            <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
              暂无收藏内容
            </div>
          )}
        </div>
      </section>

      <BottomLogo />
    </>
  );
}

/**
 * Play Page - 重构版本
 * 使用最佳实践，清晰的职责分离
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from 'react';
import type { SearchResult } from '@/lib/types';

// Hooks
import { useVideoData } from './hooks/useVideoData';
import { useSourceSelection } from './hooks/useSourceSelection';
import { useFavorite } from './hooks/useFavorite';
import { usePlaybackHistory } from './hooks/usePlaybackHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Components
import { VideoPlayer } from './components/VideoPlayer';
import { VideoInfo } from './components/VideoInfo';
import PageLayout from '@/components/PageLayout';
import EpisodeSelector from '@/components/EpisodeSelector';
import SkipController, {
  SkipSettingsButton,
} from '@/components/SkipController';

// Utils
import { syncUrlParams } from './utils/url.utils';
import { getConfig } from '@/lib/config';
import { getVideoResolutionFromM3u8 } from '@/lib/utils';

/**
 * 播放页面客户端组件
 */
function PlayPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ============================================================================
  // URL 参数解析
  // ============================================================================
  const urlParams = useMemo(
    () => ({
      source: searchParams.get('source') || '',
      id: searchParams.get('id') || '',
      title: searchParams.get('title') || '',
      year: searchParams.get('year') || '',
      searchTitle: searchParams.get('stitle') || '',
      searchType: searchParams.get('stype') || '',
      needPrefer: searchParams.get('prefer') === 'true',
      initialEpisode: Math.max(0, parseInt(searchParams.get('ep') || '1') - 1),
    }),
    [searchParams]
  );

  // ============================================================================
  // 本地状态
  // ============================================================================
  const [blockAdEnabled, setBlockAdEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enable_blockad');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [isSkipSettingMode, setIsSkipSettingMode] = useState(false);
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] =
    useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);

  // ============================================================================
  // 视频数据管理（加载视频详情）
  // ============================================================================
  const {
    data: videoData,
    loading: dataLoading,
    error: dataError,
    updateEpisodeIndex,
    updateSource,
  } = useVideoData({
    initialSource: urlParams.source,
    initialId: urlParams.id,
    initialTitle: urlParams.title,
    initialYear: urlParams.year,
    needPrefer: urlParams.needPrefer,
    searchTitle: urlParams.searchTitle,
    searchType: urlParams.searchType,
  });

  // ============================================================================
  // 换源管理
  // ============================================================================
  const {
    sources: availableSources,
    loading: sourceSearchLoading,
    error: sourceSearchError,
    searchSources,
    switchSource,
  } = useSourceSelection({
    searchTitle: urlParams.searchTitle || videoData.videoTitle,
    searchType: urlParams.searchType,
    onSuccess: (newDetail) => {
      // 换源成功，更新视频数据
      updateSource(newDetail.source, newDetail.id);

      // 同步URL参数
      syncUrlParams(
        {
          currentSource: newDetail.source,
          currentId: newDetail.id,
          videoTitle: newDetail.title,
          videoYear: newDetail.year,
        },
        videoData.currentEpisodeIndex,
        urlParams.searchTitle,
        urlParams.searchType
      );
    },
    onError: (error) => {
      console.error('换源失败:', error);
      alert(`换源失败: ${error}`);
    },
  });

  // ============================================================================
  // 收藏功能
  // ============================================================================
  const {
    favorited,
    loading: favoriteLoading,
    toggleFavorite,
  } = useFavorite({
    source: videoData.currentSource,
    id: videoData.currentId,
    title: videoData.videoTitle,
    year: videoData.videoYear,
    poster: videoData.videoCover,
    totalEpisodes: videoData.totalEpisodes,
    sourceName: videoData.detail?.source_name || '',
  });

  // ============================================================================
  // 播放历史管理
  // ============================================================================
  const { resumeTime, saveProgress, deleteRecord } = usePlaybackHistory({
    source: videoData.currentSource,
    id: videoData.currentId,
    episodeIndex: videoData.currentEpisodeIndex,
    title: videoData.videoTitle,
    year: videoData.videoYear,
    poster: videoData.videoCover,
    totalEpisodes: videoData.totalEpisodes,
    sourceName: videoData.detail?.source_name || '',
  });

  // ============================================================================
  // 键盘快捷键
  // ============================================================================
  useKeyboardShortcuts(
    [
      {
        key: 'f',
        handler: () => toggleFavorite(),
        description: '收藏/取消收藏',
      },
      {
        key: 'ArrowLeft',
        handler: () => {
          // 上一集
          if (videoData.currentEpisodeIndex > 0) {
            handleEpisodeChange(videoData.currentEpisodeIndex);
          }
        },
        description: '上一集',
        ctrlKey: true,
      },
      {
        key: 'ArrowRight',
        handler: () => {
          // 下一集
          if (videoData.currentEpisodeIndex < videoData.totalEpisodes - 1) {
            handleEpisodeChange(videoData.currentEpisodeIndex + 2);
          }
        },
        description: '下一集',
        ctrlKey: true,
      },
    ],
    playerReady && !isSkipSettingMode
  );

  // ============================================================================
  // 计算当前播放URL
  // ============================================================================
  const currentVideoUrl = useMemo(() => {
    const episodes = videoData.detail?.episodes || [];
    if (episodes.length === 0) return '';

    const episodeIndex = Math.min(
      videoData.currentEpisodeIndex,
      episodes.length - 1
    );

    return episodes[episodeIndex] || '';
  }, [videoData.detail, videoData.currentEpisodeIndex]);

  // ============================================================================
  // 集数切换
  // ============================================================================
  const handleEpisodeChange = useCallback(
    async (episode: number) => {
      const newIndex = episode - 1;

      // 保存当前进度
      if (playerReady && currentPlayTime > 1) {
        await saveProgress(currentPlayTime, videoDuration);
      }

      // 更新集数索引
      updateEpisodeIndex(newIndex);

      // 同步URL
      syncUrlParams(
        videoData,
        newIndex,
        urlParams.searchTitle,
        urlParams.searchType
      );
    },
    [
      videoData,
      currentPlayTime,
      videoDuration,
      playerReady,
      updateEpisodeIndex,
      saveProgress,
      urlParams.searchTitle,
      urlParams.searchType,
    ]
  );

  // ============================================================================
  // 下一集
  // ============================================================================
  const handleNextEpisode = useCallback(() => {
    if (videoData.currentEpisodeIndex < videoData.totalEpisodes - 1) {
      handleEpisodeChange(videoData.currentEpisodeIndex + 2);
    }
  }, [
    videoData.currentEpisodeIndex,
    videoData.totalEpisodes,
    handleEpisodeChange,
  ]);

  // ============================================================================
  // 换源
  // ============================================================================
  const handleSourceChange = useCallback(
    async (newSource: string, newId: string, newTitle: string) => {
      // 保存当前进度
      if (playerReady && currentPlayTime > 1) {
        await saveProgress(currentPlayTime, videoDuration);
      }

      // 执行换源
      await switchSource({
        newSource,
        newId,
        newTitle,
        preserveProgress: true,
      });
    },
    [playerReady, currentPlayTime, videoDuration, saveProgress, switchSource]
  );

  // ============================================================================
  // 播放器事件处理
  // ============================================================================
  const handlePlayerCreated = useCallback((player: any) => {
    playerRef.current = player;
  }, []);

  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
  }, []);

  const handleTimeUpdate = useCallback((time: number, duration: number) => {
    setCurrentPlayTime(time);
    setVideoDuration(duration);
  }, []);

  const handlePlayerPause = useCallback(() => {
    if (playerReady && currentPlayTime > 1) {
      saveProgress(currentPlayTime, videoDuration);
    }
  }, [playerReady, currentPlayTime, videoDuration, saveProgress]);

  const handlePlayerEnded = useCallback(() => {
    // 播放结束，自动下一集
    if (videoData.currentEpisodeIndex < videoData.totalEpisodes - 1) {
      handleNextEpisode();
    } else {
      // 已是最后一集，删除播放记录
      deleteRecord();
    }
  }, [
    videoData.currentEpisodeIndex,
    videoData.totalEpisodes,
    handleNextEpisode,
    deleteRecord,
  ]);

  const handlePlayerError = useCallback((error: any) => {
    console.error('播放器错误:', error);
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('player_volume', String(volume));
    }
  }, []);

  // ============================================================================
  // 初始化：设置初始集数
  // ============================================================================
  useEffect(() => {
    if (urlParams.initialEpisode > 0 && videoData.totalEpisodes > 0) {
      const validEpisode = Math.min(
        urlParams.initialEpisode,
        videoData.totalEpisodes - 1
      );
      updateEpisodeIndex(validEpisode);
    }
  }, [urlParams.initialEpisode, videoData.totalEpisodes]);

  // ============================================================================
  // 同步URL参数
  // ============================================================================
  useEffect(() => {
    if (videoData.currentSource && videoData.currentId) {
      syncUrlParams(
        videoData,
        videoData.currentEpisodeIndex,
        urlParams.searchTitle,
        urlParams.searchType
      );
    }
  }, [
    videoData.currentSource,
    videoData.currentId,
    videoData.currentEpisodeIndex,
    videoData.videoTitle,
    videoData.videoYear,
  ]);

  // ============================================================================
  // 预计算视频信息（用于换源时显示）
  // ============================================================================
  const precomputedVideoInfo = useMemo(() => {
    const infoMap = new Map<string, { title: string; year: string; episodes: number; quality: string }>();
    availableSources.forEach((source) => {
      const key = `${source.source}-${source.id}`;
      infoMap.set(key, {
        title: source.title,
        year: source.year,
        episodes: source.episodes?.length || 0,
        quality: source.playSources?.[0]?.quality || '',
      });
    });
    return infoMap;
  }, [availableSources]);

  // ============================================================================
  // 加载中状态
  // ============================================================================
  if (dataLoading) {
    return (
      <PageLayout activePath='/play'>
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]' />
            <p className='mt-4 text-lg'>加载中...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ============================================================================
  // 错误状态
  // ============================================================================
  if (dataError || !videoData.currentSource || !videoData.currentId) {
    return (
      <PageLayout activePath='/play'>
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold mb-4'>加载失败</h1>
            <p className='text-gray-600 dark:text-gray-400 mb-4'>
              {dataError || '缺少必要参数'}
            </p>
            <button
              onClick={() => router.push('/')}
              className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            >
              返回首页
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ============================================================================
  // 主界面渲染
  // ============================================================================
  return (
    <PageLayout activePath='/play'>
      <div className='flex flex-col gap-3 py-4 px-5 lg:px-[3rem] 2xl:px-20'>
        {/* 第一行：影片标题和操作按钮 */}
        <div className='py-1 flex items-center justify-between'>
          <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
            {videoData.videoTitle || '影片标题'}
            {videoData.totalEpisodes > 1 && (
              <span className='text-gray-500 dark:text-gray-400'>
                {` > 第 ${videoData.currentEpisodeIndex + 1} 集`}
              </span>
            )}
          </h1>

          {/* 跳过设置按钮 */}
          {videoData.currentSource && videoData.currentId && (
            <SkipSettingsButton onClick={() => setIsSkipSettingMode(true)} />
          )}
        </div>

        {/* 第二行：播放器和选集 */}
        <div className='space-y-2'>
          {/* 折叠控制 - 仅在 lg 及以上屏幕显示 */}
          <div className='hidden lg:flex justify-end'>
            <button
              onClick={() =>
                setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)
              }
              className='group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200'
              title={
                isEpisodeSelectorCollapsed ? '显示选集面板' : '隐藏选集面板'
              }
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                  isEpisodeSelectorCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 5l7 7-7 7'
                />
              </svg>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                {isEpisodeSelectorCollapsed ? '显示' : '隐藏'}
              </span>

              {/* 状态指示点 */}
              <div
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full transition-all duration-200 ${
                  isEpisodeSelectorCollapsed
                    ? 'bg-orange-400 animate-pulse'
                    : 'bg-green-400'
                }`}
              />
            </button>
          </div>

          <div
            className={`grid gap-4 lg:h-[500px] xl:h-[650px] 2xl:h-[750px] transition-all duration-300 ease-in-out ${
              isEpisodeSelectorCollapsed
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-4'
            }`}
          >
            {/* 播放器 */}
            <div
              className={`h-full transition-all duration-300 ease-in-out rounded-xl border border-white/0 dark:border-white/30 ${
                isEpisodeSelectorCollapsed ? 'col-span-1' : 'md:col-span-3'
              }`}
            >
              <div className='relative w-full h-[300px] lg:h-full'>
                {/* 视频播放器 */}
                <VideoPlayer
                  url={currentVideoUrl}
                  poster={videoData.videoCover}
                  title={videoData.videoTitle}
                  blockAdEnabled={blockAdEnabled}
                  loading={dataLoading}
                  resumeTime={resumeTime}
                  onReady={handlePlayerReady}
                  onPlayerCreated={handlePlayerCreated}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handlePlayerEnded}
                  onPause={handlePlayerPause}
                  onError={handlePlayerError}
                  onVolumeChange={handleVolumeChange}
                  onNextEpisode={handleNextEpisode}
                  className='rounded-xl shadow-lg'
                />

                {/* 跳过片头片尾控制器 */}
                {videoData.currentSource && videoData.currentId && (
                  <SkipController
                    source={videoData.currentSource}
                    id={videoData.currentId}
                    title={videoData.videoTitle}
                    artPlayerRef={playerRef}
                    currentTime={currentPlayTime}
                    duration={videoDuration}
                    isSettingMode={isSkipSettingMode}
                    onSettingModeChange={setIsSkipSettingMode}
                    onNextEpisode={handleNextEpisode}
                  />
                )}
              </div>
            </div>

            {/* 选集和换源 */}
            <div
              className={`h-[600px] lg:h-full md:overflow-hidden transition-all duration-300 ease-in-out ${
                isEpisodeSelectorCollapsed
                  ? 'md:col-span-1 lg:hidden lg:opacity-0 lg:scale-95'
                  : 'md:col-span-1 lg:opacity-100 lg:scale-100'
              }`}
            >
              <EpisodeSelector
                totalEpisodes={videoData.totalEpisodes}
                episodesPerPage={50}
                value={videoData.currentEpisodeIndex + 1}
                onChange={handleEpisodeChange}
                onSourceChange={handleSourceChange}
                currentSource={videoData.currentSource}
                currentId={videoData.currentId}
                videoTitle={urlParams.searchTitle || videoData.videoTitle}
                availableSources={availableSources}
                sourceSearchLoading={sourceSearchLoading}
                sourceSearchError={sourceSearchError}
                precomputedVideoInfo={precomputedVideoInfo}
              />
            </div>
          </div>
        </div>

        {/* 详情展示 */}
        <VideoInfo
          title={videoData.videoTitle}
          year={videoData.videoYear}
          cover={videoData.videoCover}
          detail={videoData.detail}
          favorited={favorited}
          favoriteLoading={favoriteLoading}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </PageLayout>
  );
}

/**
 * 播放页面（服务端入口）
 */
export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <PageLayout activePath='/play'>
          <div className='flex items-center justify-center min-h-screen'>
            <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent' />
          </div>
        </PageLayout>
      }
    >
      <PlayPageClient />
    </Suspense>
  );
}

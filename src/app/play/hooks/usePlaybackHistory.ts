/**
 * usePlaybackHistory Hook
 * 管理播放记录的保存、加载和删除
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deletePlayRecord,
  getAllPlayRecords,
  savePlayRecord,
} from '@/lib/db.client';
import { logError } from '@/lib/logger';

import type { UsePlaybackHistoryReturn } from '../types/player.types';
import { getSaveInterval } from '../utils/player.utils';

interface UsePlaybackHistoryOptions {
  source: string;
  id: string;
  episodeIndex: number;
  title: string;
  year: string;
  poster: string;
  totalEpisodes: number;
  sourceName?: string;
  enabled?: boolean;
}

/**
 * 播放记录Hook
 */
export function usePlaybackHistory(
  options: UsePlaybackHistoryOptions
): UsePlaybackHistoryReturn {
  const {
    source,
    id,
    episodeIndex,
    title,
    year,
    poster,
    totalEpisodes,
    sourceName = '',
    enabled = true,
  } = options;

  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const lastSaveTimeRef = useRef(0);
  const sourceRef = useRef(source);
  const idRef = useRef(id);

  // 同步refs
  useEffect(() => {
    sourceRef.current = source;
    idRef.current = id;
  }, [source, id]);

  // 加载历史记录
  useEffect(() => {
    if (!enabled || !source || !id) return;

    const loadHistory = async () => {
      try {
        const recordsObj = await getAllPlayRecords();
        const key = `${source}+${id}`;
        const record = recordsObj[key];

        if (record) {
          // 如果记录的集数与当前集数匹配，恢复播放进度
          if (record.index === episodeIndex) {
            const targetTime = record.play_time || 0;
            // 如果播放时间接近结束（剩余<5秒），跳到结束前5秒
            if (record.total_time && targetTime >= record.total_time - 2) {
              setResumeTime(Math.max(0, record.total_time - 5));
            } else {
              setResumeTime(targetTime);
            }
          }
        }
      } catch (err) {
        logError('读取播放记录失败', err);
      }
    };

    loadHistory();
  }, [source, id, episodeIndex, enabled]);

  // 保存播放进度
  const saveProgress = useCallback(
    async (currentTime: number, duration: number) => {
      if (!enabled || !source || !id) return;

      // 节流：根据存储类型决定保存间隔
      const now = Date.now();
      const interval = getSaveInterval();
      if (now - lastSaveTimeRef.current < interval) {
        return;
      }
      lastSaveTimeRef.current = now;

      try {
        await savePlayRecord(source, id, {
          title,
          source_name: sourceName,
          cover: poster,
          year,
          index: episodeIndex,
          total_episodes: totalEpisodes,
          play_time: currentTime,
          total_time: duration,
          save_time: now,
          search_title: title,
        });
      } catch (err) {
        logError('保存播放记录失败', err);
      }
    },
    [
      source,
      id,
      episodeIndex,
      title,
      year,
      poster,
      totalEpisodes,
      sourceName,
      enabled,
    ]
  );

  // 删除播放记录
  const deleteRecord = useCallback(async () => {
    if (!source || !id) return;

    try {
      await deletePlayRecord(source, id);
      setResumeTime(null);
    } catch (err) {
      logError('删除播放记录失败', err);
    }
  }, [source, id]);

  return {
    resumeTime,
    saveProgress,
    deleteRecord,
  };
}

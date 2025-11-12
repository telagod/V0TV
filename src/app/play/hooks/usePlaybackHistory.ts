/**
 * usePlaybackHistory Hook
 * 管理播放记录的保存、加载和删除
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  savePlayRecord,
  deletePlayRecord,
  getAllPlayRecords,
} from '@/lib/db.client';
import type { UsePlaybackHistoryReturn } from '../types/player.types';
import { getSaveInterval } from '../utils/player.utils';

interface UsePlaybackHistoryOptions {
  source: string;
  id: string;
  episodeIndex: number;
  videoTitle: string;
  videoCover: string;
  enabled?: boolean;
}

/**
 * 播放记录Hook
 */
export function usePlaybackHistory(
  options: UsePlaybackHistoryOptions,
): UsePlaybackHistoryReturn {
  const {
    source,
    id,
    episodeIndex,
    videoTitle,
    videoCover,
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
        const records = await getAllPlayRecords();
        const record = records.find((r) => r.source === source && r.id === id);

        if (record) {
          // 如果记录的集数与当前集数匹配，恢复播放进度
          if (record.episodeIndex === episodeIndex) {
            const targetTime = record.currentTime || 0;
            // 如果播放时间接近结束（剩余<5秒），跳到结束前5秒
            if (record.duration && targetTime >= record.duration - 2) {
              setResumeTime(Math.max(0, record.duration - 5));
            } else {
              setResumeTime(targetTime);
            }
          }
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
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
          episodeIndex,
          currentTime,
          duration,
          title: videoTitle,
          cover: videoCover,
          updatedAt: now,
        });
      } catch (err) {
        console.error('保存播放记录失败:', err);
      }
    },
    [source, id, episodeIndex, videoTitle, videoCover, enabled],
  );

  // 删除播放记录
  const deleteRecord = useCallback(async () => {
    if (!source || !id) return;

    try {
      await deletePlayRecord(source, id);
      setResumeTime(null);
    } catch (err) {
      console.error('删除播放记录失败:', err);
    }
  }, [source, id]);

  return {
    resumeTime,
    saveProgress,
    deleteRecord,
  };
}

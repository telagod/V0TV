import { NextRequest, NextResponse } from 'next/server';

import { getAvailableApiSites } from '@/lib/config';
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors';
import { getStorage } from '@/lib/db';
import { logError } from '@/lib/logger';
import { sourceManager } from '@/lib/source';
import { getVerifiedUserName } from '@/lib/user-context';

function isUsableResult(item: unknown): boolean {
  const r = item as {
    id?: unknown;
    title?: unknown;
    source?: unknown;
    poster?: unknown;
    episodes?: unknown;
  };

  if (typeof r?.id !== 'string' || !r.id) return false;
  if (typeof r?.title !== 'string' || !r.title.trim()) return false;
  if (typeof r?.source !== 'string' || !r.source) return false;
  if (typeof r?.poster !== 'string' || !r.poster) return false;
  if (!Array.isArray(r?.episodes) || r.episodes.length === 0) return false;
  if (typeof r.episodes[0] !== 'string' || !r.episodes[0]) return false;
  return true;
}

// 处理OPTIONS预检请求（OrionTV客户端需要）
export async function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const maxSitesParam = searchParams.get('maxSites');
  const maxSites =
    maxSitesParam && /^\d+$/.test(maxSitesParam)
      ? Number(maxSitesParam)
      : null;

  if (!query) {
    const response = NextResponse.json(
      {
        regular_results: [],
        adult_results: [],
        meta: { partial: false, sites_searched: 0, sites_total: 0 },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
    return addCorsHeaders(response);
  }

  try {
    // 获取 D1 数据库实例
    let dbInstance;
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;
    if (storageType === 'd1') {
      try {
        const { getCloudflareContext } = await import('@opennextjs/cloudflare');
        const context = getCloudflareContext();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dbInstance = (context.env as any).DB;
      } catch (error) {
        logError('[search] 无法获取 Cloudflare Context', error);
      }
    }

    // 获取用户身份（仅信任已验证的 cookie）
    const userName = await getVerifiedUserName(request);

    // 获取用户的成人内容过滤设置：默认过滤；用户可在设置里关闭过滤
    let shouldFilterAdult = true;
    if (userName) {
      try {
        const storage = getStorage(dbInstance);
        const userSettings = await storage.getUserSettings(userName);
        // 如果用户设置存在且明确设为false，则不过滤；否则默认过滤
        shouldFilterAdult = userSettings?.filter_adult_content !== false;
      } catch (error) {
        // 出错时默认过滤成人内容
        logError('[成人内容过滤] 获取用户设置失败，默认过滤', error);
        shouldFilterAdult = true;
      }
    }

    // 获取全部站点（用于分组），并按用户设置决定是否允许搜索成人源
    const allSites = await getAvailableApiSites(false);
    const siteByKey = new Map(allSites.map((s) => [s.key, s]));
    let sitesToSearch = shouldFilterAdult
      ? allSites.filter((s) => !s.is_adult)
      : allSites;

    const sitesTotal = sitesToSearch.length;
    if (maxSites && maxSites > 0) {
      sitesToSearch = sitesToSearch.slice(0, maxSites);
    }
    const sitesSearched = sitesToSearch.length;

    if (!sitesToSearch || sitesToSearch.length === 0) {
      const response = NextResponse.json(
        {
          regular_results: [],
          adult_results: [],
          meta: { partial: false, sites_searched: 0, sites_total: sitesTotal },
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
      return addCorsHeaders(response);
    }

    // 使用 sourceManager 进行批量搜索 (优化: 并发控制已内置)
    const searchResults = await sourceManager.searchMultiple(sitesToSearch, query);

    const usable = searchResults.filter(isUsableResult);

    // 按源站的 is_adult 分组（仅在用户关闭过滤时返回 adult_results）
    const regularResults = [];
    const adultResults = [];
    for (const item of usable) {
      const site = siteByKey.get(item.source);
      if (site?.is_adult) adultResults.push(item);
      else regularResults.push(item);
    }

    const response = NextResponse.json(
      {
        regular_results: regularResults,
        adult_results: shouldFilterAdult ? [] : adultResults,
        meta: {
          partial: Boolean(maxSites && sitesSearched < sitesTotal),
          sites_searched: sitesSearched,
          sites_total: sitesTotal,
        },
      },
      {
        headers: {
          // 用户偏好相关：禁止共享缓存，避免不同用户结果混淆
          'Cache-Control': 'no-store',
          Vary: 'Cookie',
        },
      },
    );
    return addCorsHeaders(response);
  } catch (error) {
    logError('[search] 搜索失败', error);
    const errorMessage = error instanceof Error ? error.message : '搜索失败';
    const response = NextResponse.json(
      {
        regular_results: [],
        adult_results: [],
        error: errorMessage,
      },
      { status: 500 },
    );
    return addCorsHeaders(response);
  }
}

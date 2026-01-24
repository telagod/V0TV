import { NextRequest, NextResponse } from 'next/server';

import { getAvailableApiSites } from '@/lib/config';
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors';
import { getStorage } from '@/lib/db';
import { logError } from '@/lib/logger';
import { sourceManager } from '@/lib/source';
import { getVerifiedUserName } from '@/lib/user-context';

// 处理OPTIONS预检请求（OrionTV客户端需要）
export async function OPTIONS() {
  return handleOptionsRequest();
}

// OrionTV 兼容接口
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const resourceId = searchParams.get('resourceId');

  if (!query || !resourceId) {
    const response = NextResponse.json(
      { result: null, error: '缺少必要参数: q 或 resourceId' },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
    return addCorsHeaders(response);
  }

  // 获取 D1 数据库实例（用于读取用户设置）
  let dbInstance;
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;
  if (storageType === 'd1') {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const context = getCloudflareContext();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbInstance = (context.env as any).DB;
    } catch (error) {
      logError('[search/one] 无法获取 Cloudflare Context', error);
    }
  }

  const userName = await getVerifiedUserName(request);
  let shouldFilterAdult = true;
  if (userName) {
    try {
      const storage = getStorage(dbInstance);
      const settings = await storage.getUserSettings(userName);
      shouldFilterAdult = settings?.filter_adult_content !== false;
    } catch (error) {
      logError('[search/one] 获取用户设置失败，默认过滤成人内容', error);
      shouldFilterAdult = true;
    }
  }

  const apiSites = await getAvailableApiSites(false);

  try {
    // 根据 resourceId 查找对应的 API 站点
    const targetSite = apiSites.find((site) => site.key === resourceId);
    if (!targetSite) {
      const response = NextResponse.json(
        {
          error: `未找到指定的视频源: ${resourceId}`,
          result: null,
        },
        { status: 404 },
      );
      return addCorsHeaders(response);
    }

    if (shouldFilterAdult && targetSite.is_adult === true) {
      const response = NextResponse.json(
        {
          error: '已开启成人内容过滤，禁止访问该资源站',
          result: null,
        },
        { status: 403, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } },
      );
      return addCorsHeaders(response);
    }

    const results = await sourceManager.search(targetSite, query);
    const result = results.filter((r) => r.title === query);

    if (result.length === 0) {
      const response = NextResponse.json(
        {
          error: '未找到结果',
          result: null,
        },
        { status: 404 },
      );
      return addCorsHeaders(response);
    } else {
      const response = NextResponse.json(
        { results: result },
        {
          headers: {
            'Cache-Control': 'no-store',
            Vary: 'Cookie',
          },
        },
      );
      return addCorsHeaders(response);
    }
  } catch {
    const response = NextResponse.json(
      {
        error: '搜索失败',
        result: null,
      },
      { status: 500 },
    );
    return addCorsHeaders(response);
  }
}

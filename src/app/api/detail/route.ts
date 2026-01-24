import { NextRequest, NextResponse } from 'next/server';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors';
import { getStorage } from '@/lib/db';
import { logError } from '@/lib/logger';
import { sourceManager } from '@/lib/source';
import { getVerifiedUserName } from '@/lib/user-context';

// 处理OPTIONS预检请求（OrionTV客户端需要）
export async function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const sourceCode = searchParams.get('source');

  if (!id || !sourceCode) {
    const response = NextResponse.json(
      { error: '缺少必要参数' },
      { status: 400 },
    );
    return addCorsHeaders(response);
  }

  // 兼容更多上游 ID 形态（部分源会包含 '.'），同时保持基本约束避免注入/异常
  if (id.length > 200 || /\s/.test(id) || !/^[\w.-]+$/.test(id)) {
    const response = NextResponse.json(
      { error: '无效的视频ID格式' },
      { status: 400 },
    );
    return addCorsHeaders(response);
  }

  try {
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
        logError('[detail] 无法获取 Cloudflare Context', error);
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
        logError('[detail] 获取用户设置失败，默认过滤成人内容', error);
        shouldFilterAdult = true;
      }
    }

    const apiSites = await getAvailableApiSites(false);
    const apiSite = apiSites.find((site) => site.key === sourceCode);

    if (!apiSite) {
      const response = NextResponse.json(
        { error: '无效的API来源' },
        { status: 400 },
      );
      return addCorsHeaders(response);
    }

    // 用户开启过滤时：禁止访问成人源详情（防止直接拼接 source/id 绕过）
    if (shouldFilterAdult && apiSite.is_adult === true) {
      const response = NextResponse.json(
        { error: '已开启成人内容过滤，禁止访问该资源站' },
        { status: 403, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } },
      );
      return addCorsHeaders(response);
    }

    const result = await sourceManager.getDetail(apiSite, id);
    const cacheTime = await getCacheTime();

    const isAdult = apiSite.is_adult === true;
    const response = NextResponse.json(result, {
      headers: isAdult
        ? { 'Cache-Control': 'no-store', Vary: 'Cookie' }
        : {
            'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
            'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
            'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          },
    });
    return addCorsHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
    return addCorsHeaders(response);
  }
}

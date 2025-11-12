import { NextResponse } from 'next/server';

import { getAvailableApiSites,getCacheTime } from '@/lib/config';
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors';
import { getStorage } from '@/lib/db';
import { searchFromApi } from '@/lib/downstream';

export const runtime = 'edge';

// 处理OPTIONS预检请求（OrionTV客户端需要）
export async function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  // 从 Authorization header 或 query parameter 获取用户名
  let userName: string | undefined = searchParams.get('user') || undefined;
  if (!userName) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userName = authHeader.substring(7);
    }
  }

  if (!query) {
    const cacheTime = await getCacheTime();
    const response = NextResponse.json(
      { 
        regular_results: [],
        adult_results: []
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
    return addCorsHeaders(response);
  }

  try {
    // 获取用户的成人内容过滤设置（完全依赖服务端，移除客户端参数）
    let shouldFilterAdult = true; // 默认过滤
    if (userName) {
      try {
        const storage = getStorage();
        const userSettings = await storage.getUserSettings(userName);
        // 如果用户设置存在且明确设为false，则不过滤；否则默认过滤
        shouldFilterAdult = userSettings?.filter_adult_content !== false;
      } catch (error) {
        // 出错时默认过滤成人内容
        console.error('[成人内容过滤] 获取用户设置失败，默认过滤:', error);
        shouldFilterAdult = true;
      }
    }

    // 使用动态过滤方法，完全基于用户设置（不受客户端参数影响）
    const availableSites = await getAvailableApiSites(shouldFilterAdult);

    if (!availableSites || availableSites.length === 0) {
      const cacheTime = await getCacheTime();
      const response = NextResponse.json({
        regular_results: [],
        adult_results: []
      }, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      });
      return addCorsHeaders(response);
    }

    // 搜索所有可用的资源站（已根据用户设置动态过滤）
    const searchPromises = availableSites.map((site) => searchFromApi(site, query));
    const searchResults = (await Promise.all(searchPromises)).flat();

    // 所有结果都作为常规结果返回，因为成人内容源已经在源头被过滤掉了
    const cacheTime = await getCacheTime();
    const response = NextResponse.json(
      {
        regular_results: searchResults,
        adult_results: [] // 始终为空，因为成人内容在源头就被过滤了
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
    return addCorsHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { 
        regular_results: [],
        adult_results: [],
        error: '搜索失败' 
      }, 
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

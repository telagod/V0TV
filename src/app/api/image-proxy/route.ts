import { NextResponse } from 'next/server';

import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors';

// 处理OPTIONS预检请求（OrionTV客户端需要）
export async function OPTIONS() {
  return handleOptionsRequest();
}

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    const response = NextResponse.json(
      { error: 'Missing image URL' },
      { status: 400 },
    );
    return addCorsHeaders(response);
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    });

    if (!imageResponse.ok) {
      const response = NextResponse.json(
        { error: imageResponse.statusText },
        { status: imageResponse.status },
      );
      return addCorsHeaders(response);
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      const response = NextResponse.json(
        { error: 'Image response has no body' },
        { status: 500 },
      );
      return addCorsHeaders(response);
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头 - 7 天缓存（减少 CDN 存储占用）
    headers.set('Cache-Control', 'public, max-age=604800, s-maxage=604800'); // 7 天
    headers.set('CDN-Cache-Control', 'public, s-maxage=604800');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=604800');

    // 直接返回图片流
    const response = new Response(imageResponse.body, {
      status: 200,
      headers,
    });
    return addCorsHeaders(response);
  } catch {
    const response = NextResponse.json(
      { error: 'Error fetching image' },
      { status: 500 },
    );
    return addCorsHeaders(response);
  }
}

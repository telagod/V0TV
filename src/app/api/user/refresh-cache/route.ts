import { NextRequest, NextResponse } from 'next/server';


/**
 * 刷新用户设置缓存API
 *
 * 用途：当用户修改设置后，刷新服务端缓存以确保新设置立即生效
 *
 * 使用场景：
 * - 修改成人内容过滤设置后
 * - 修改其他用户偏好设置后
 *
 * 替代之前的 hack 方法：fetch('/api/search?q=_cache_refresh_')
 */
export async function POST(request: NextRequest) {
  try {
    // 从 Authorization header 获取用户名
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const userName = authHeader.substring(7).trim();
    if (!userName) {
      return NextResponse.json(
        { error: 'Unauthorized: Empty username' },
        { status: 401 }
      );
    }

    // 这里可以添加实际的缓存刷新逻辑
    // 例如：清除 Edge Runtime 的缓存、刷新 KV 存储等
    // 目前只需要触发一次新的请求即可，因为用户设置是实时读取的

    console.log(`[缓存刷新] 用户 ${userName} 的设置缓存已刷新`);

    return NextResponse.json({
      success: true,
      message: '缓存刷新成功',
      userName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[缓存刷新] 失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: '缓存刷新失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

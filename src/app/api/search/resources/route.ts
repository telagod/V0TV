import { NextRequest, NextResponse } from 'next/server';

import { getAvailableApiSites } from '@/lib/config';
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors';
import { getStorage } from '@/lib/db';
import { logError } from '@/lib/logger';
import { getVerifiedUserName } from '@/lib/user-context';

// 处理OPTIONS预检请求（OrionTV客户端需要）
export async function OPTIONS() {
  return handleOptionsRequest();
}

// OrionTV 兼容接口
export async function GET(request: NextRequest) {
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
        logError('[search/resources] 无法获取 Cloudflare Context', error);
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
        logError('[search/resources] 获取用户设置失败，默认过滤成人内容', error);
        shouldFilterAdult = true;
      }
    }

    const apiSites = await getAvailableApiSites(false);
    const filteredSites = shouldFilterAdult
      ? apiSites.filter((s) => !s.is_adult)
      : apiSites;

    const response = NextResponse.json(filteredSites, {
      headers: {
        'Cache-Control': 'no-store',
        Vary: 'Cookie',
      },
    });
    return addCorsHeaders(response);
  } catch {
    const response = NextResponse.json(
      { error: '获取资源失败' },
      { status: 500 },
    );
    return addCorsHeaders(response);
  }
}

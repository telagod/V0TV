import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '本地存储不需要初始化数据库' },
      { status: 400 },
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storage = getStorage();
    if (!storage) {
      return NextResponse.json({ error: '无法获取存储实例' }, { status: 500 });
    }

    // 检查是否已有配置
    let adminConfig = null;
    const storageWithAdminConfig = storage as unknown as {
      getAdminConfig?: () => Promise<unknown>;
    };
    if (typeof storageWithAdminConfig.getAdminConfig === 'function') {
      adminConfig = await storageWithAdminConfig.getAdminConfig();
    }

    if (adminConfig) {
      return NextResponse.json({
        message: '数据库已初始化',
        config: adminConfig,
      });
    }

    // 初始化配置
    await getConfig();

    return NextResponse.json({
      message: '数据库初始化成功',
    });
  } catch (error) {
    logError('初始化数据库失败:', error);
    return NextResponse.json(
      {
        error: '初始化数据库失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

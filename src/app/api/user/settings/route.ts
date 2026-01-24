import { NextRequest, NextResponse } from 'next/server';

import { getStorage } from '@/lib/db';
import { logError } from '@/lib/logger';
import { UserSettings } from '@/lib/types';
import { getVerifiedUserName } from '@/lib/user-context';

// 设置运行时为 Edge Runtime，确保部署兼容性

function getUserNameFromAuthorization(request: NextRequest): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  const userName = authorization.split(' ')[1];
  return userName?.trim() ? userName.trim() : null;
}

// 获取用户设置
export async function GET(request: NextRequest) {
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
        logError('[user/settings GET] 无法获取 Cloudflare Context', error);
      }
    }

    const userName =
      storageType === 'localstorage'
        ? getUserNameFromAuthorization(request)
        : await getVerifiedUserName(request);

    if (!userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const storage = getStorage(dbInstance);
    const settings = await storage.getUserSettings(userName);

    return NextResponse.json(
      {
        settings: settings || {
          filter_adult_content: true, // 默认开启成人内容过滤
          theme: 'auto',
          language: 'zh-CN',
          auto_play: true,
          video_quality: 'auto',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    logError('Error getting user settings', error);
    return NextResponse.json({ error: '获取用户设置失败' }, { status: 500 });
  }
}

// 更新用户设置
export async function PATCH(request: NextRequest) {
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
        logError('[user/settings PATCH] 无法获取 Cloudflare Context', error);
      }
    }

    const userName =
      storageType === 'localstorage'
        ? getUserNameFromAuthorization(request)
        : await getVerifiedUserName(request);

    if (!userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body as { settings: Partial<UserSettings> };

    if (!settings) {
      return NextResponse.json({ error: '设置数据不能为空' }, { status: 400 });
    }

    const storage = getStorage(dbInstance);

    await storage.updateUserSettings(userName, settings);

    return NextResponse.json(
      {
        success: true,
        message: '设置更新成功',
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    logError('Error updating user settings', error);
    return NextResponse.json({ error: '更新用户设置失败' }, { status: 500 });
  }
}

// 重置用户设置
export async function PUT(request: NextRequest) {
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
        logError('[user/settings PUT] 无法获取 Cloudflare Context', error);
      }
    }

    const userName =
      storageType === 'localstorage'
        ? getUserNameFromAuthorization(request)
        : await getVerifiedUserName(request);

    if (!userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body as { settings: UserSettings };

    if (!settings) {
      return NextResponse.json({ error: '设置数据不能为空' }, { status: 400 });
    }

    const storage = getStorage(dbInstance);

    await storage.setUserSettings(userName, settings);

    return NextResponse.json({
      success: true,
      message: '设置已重置',
    });
  } catch (error) {
    logError('Error resetting user settings', error);
    return NextResponse.json({ error: '重置用户设置失败' }, { status: 500 });
  }
}

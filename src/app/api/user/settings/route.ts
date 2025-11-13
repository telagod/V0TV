import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getStorage } from '@/lib/db';
import { UserSettings } from '@/lib/types';

// 设置运行时为 Edge Runtime，确保部署兼容性

// 获取用户设置
export async function GET(_request: NextRequest) {
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
        console.error('[user/settings GET] 无法获取 Cloudflare Context:', error);
      }
    }

    const headersList = headers();
    const authorization = headersList.get('Authorization');

    if (!authorization) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const userName = authorization.split(' ')[1]; // 假设格式为 "Bearer username"

    if (!userName) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
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
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting user settings:', error);
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
        console.error('[user/settings PATCH] 无法获取 Cloudflare Context:', error);
      }
    }

    const headersList = headers();
    const authorization = headersList.get('Authorization');

    if (!authorization) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const userName = authorization.split(' ')[1];

    if (!userName) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    const body = await request.json();
    const { settings } = body as { settings: Partial<UserSettings> };

    if (!settings) {
      return NextResponse.json({ error: '设置数据不能为空' }, { status: 400 });
    }

    const storage = getStorage(dbInstance);

    // 验证用户存在
    const userExists = await storage.checkUserExist(userName);
    if (!userExists) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

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
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating user settings:', error);
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
        console.error('[user/settings PUT] 无法获取 Cloudflare Context:', error);
      }
    }

    const headersList = headers();
    const authorization = headersList.get('Authorization');

    if (!authorization) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const userName = authorization.split(' ')[1];

    if (!userName) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    const body = await request.json();
    const { settings } = body as { settings: UserSettings };

    if (!settings) {
      return NextResponse.json({ error: '设置数据不能为空' }, { status: 400 });
    }

    const storage = getStorage(dbInstance);

    // 验证用户存在
    const userExists = await storage.checkUserExist(userName);
    if (!userExists) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    await storage.setUserSettings(userName, settings);

    return NextResponse.json({
      success: true,
      message: '设置已重置',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error resetting user settings:', error);
    return NextResponse.json({ error: '重置用户设置失败' }, { status: 500 });
  }
}

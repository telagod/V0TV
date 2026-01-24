import { NextRequest } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { verifySignatureHex } from '@/lib/auth-signature';

export async function getVerifiedUserName(
  request: NextRequest,
): Promise<string | null> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo) return null;

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  // localstorage 模式：cookie 里只有 password（无 username），不支持“按用户”设置
  if (storageType === 'localstorage') {
    return null;
  }

  if (!authInfo.username || !authInfo.signature || !process.env.PASSWORD) {
    return null;
  }

  const ok = await verifySignatureHex(
    authInfo.username,
    authInfo.signature,
    process.env.PASSWORD,
  );
  return ok ? authInfo.username : null;
}


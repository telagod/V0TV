import { NextRequest, NextResponse } from 'next/server';

function rewriteM3u8(content: string, baseUrl: string, proxyOrigin: string): string {
  const proxyBase = proxyOrigin.split('?')[0];
  return content.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      // 重写 URI= 里的密钥地址
      if (trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          const abs = uri.startsWith('http') ? uri : baseUrl + uri;
          return `URI="${proxyBase}?url=${encodeURIComponent(abs)}"`;
        });
      }
      return line;
    }
    // 相对路径转绝对路径再走代理
    const abs = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
    return `${proxyBase}?url=${encodeURIComponent(abs)}`;
  }).join('\n');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  try {
    const decoded = decodeURIComponent(url);
    if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
      return NextResponse.json({ error: '无效的 URL' }, { status: 400 });
    }

    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: new URL(decoded).origin + '/',
      },
    });

    if (!response.ok) {
      return new NextResponse(`upstream ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    // m3u8 内容需要重写内部的相对路径为绝对路径
    if (contentType.includes('mpegurl') || contentType.includes('m3u8') || decoded.endsWith('.m3u8')) {
      const text = new TextDecoder().decode(body);
      const baseUrl = decoded.substring(0, decoded.lastIndexOf('/') + 1);
      const rewritten = rewriteM3u8(text, baseUrl, request.url);

      return new NextResponse(rewritten, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=30',
        },
      });
    }

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

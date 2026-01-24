#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 图标生成脚本
 * 生成 PWA 所需的各种尺寸图标和 favicon
 */

// 简化版SVG图标（适合小尺寸显示）
const iconSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="playGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="512" height="512" rx="80" fill="url(#mainGradient)"/>

  <!-- 电视屏幕 -->
  <rect x="96" y="120" width="320" height="240" rx="24" fill="#1e293b" opacity="0.9"/>

  <!-- 屏幕高光 -->
  <rect x="96" y="120" width="320" height="80" rx="24" fill="url(#playGradient)" opacity="0.2"/>

  <!-- 播放按钮背景 -->
  <circle cx="256" cy="240" r="52" fill="url(#playGradient)" opacity="0.95"/>

  <!-- 播放三角形 -->
  <path d="M 238 215 L 238 265 L 280 240 Z" fill="white"/>

  <!-- 电视底座 -->
  <rect x="216" y="368" width="80" height="20" rx="10" fill="url(#mainGradient)" opacity="0.7"/>
  <rect x="180" y="388" width="152" height="16" rx="8" fill="url(#mainGradient)" opacity="0.5"/>
</svg>`;

// 创建 icons 目录
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 保存SVG图标
const iconSvgPath = path.join(iconsDir, 'icon.svg');
fs.writeFileSync(iconSvgPath, iconSvg);
console.log('✅ 已生成 icon.svg');

// 检查是否安装了 sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('\n⚠️  未安装 sharp 包，尝试安装...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install --no-save sharp', { stdio: 'inherit' });
    sharp = require('sharp');
    console.log('✅ sharp 安装成功');
  } catch (installError) {
    console.error('❌ 无法安装 sharp，请手动安装：npm install sharp');
    console.log('\n📝 已生成 icon.svg，请使用在线工具转换为 PNG：');
    console.log('   - https://cloudconvert.com/svg-to-png');
    console.log('   - https://svgtopng.com/');
    process.exit(0);
  }
}

// 生成不同尺寸的PNG图标
const sizes = [192, 256, 384, 512];

async function generateIcons() {
  console.log('\n🎨 开始生成 PNG 图标...\n');

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(Buffer.from(iconSvg))
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ 已生成 icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ 生成 icon-${size}x${size}.png 失败:`, error.message);
    }
  }

  // 生成 favicon.ico (使用 32x32)
  try {
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(Buffer.from(iconSvg))
      .resize(32, 32)
      .png()
      .toFile(faviconPath.replace('.ico', '-temp.png'));

    // 将PNG重命名为ICO（实际上现代浏览器支持PNG作为favicon）
    const tempPngPath = faviconPath.replace('.ico', '-temp.png');
    const faviconPngPath = path.join(__dirname, '../public/favicon.png');
    fs.renameSync(tempPngPath, faviconPngPath);

    console.log('✅ 已生成 favicon.png (32x32)');
    console.log('\n💡 提示: 现代浏览器支持 PNG 格式的 favicon');
    console.log(
      '   如需 .ico 格式，请使用: https://favicon.io/favicon-converter/',
    );
  } catch (error) {
    console.error('❌ 生成 favicon 失败:', error.message);
  }

  // 生成 Apple Touch Icon
  try {
    const appleTouchIconPath = path.join(
      __dirname,
      '../public/apple-touch-icon.png',
    );
    await sharp(Buffer.from(iconSvg))
      .resize(180, 180)
      .png()
      .toFile(appleTouchIconPath);

    console.log('✅ 已生成 apple-touch-icon.png (180x180)');
  } catch (error) {
    console.error('❌ 生成 apple-touch-icon 失败:', error.message);
  }

  console.log('\n🎉 所有图标生成完成！');
  console.log('\n📊 生成的文件:');
  console.log('   - public/icons/icon.svg');
  console.log('   - public/icons/icon-192x192.png');
  console.log('   - public/icons/icon-256x256.png');
  console.log('   - public/icons/icon-384x384.png');
  console.log('   - public/icons/icon-512x512.png');
  console.log('   - public/favicon.png');
  console.log('   - public/apple-touch-icon.png');
}

// 执行生成
generateIcons().catch((error) => {
  console.error('❌ 生成图标时出错:', error);
  process.exit(1);
});

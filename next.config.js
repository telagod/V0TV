/** @type {import('next').NextConfig} */
/* eslint-disable @typescript-eslint/no-var-requires */
const nextConfig = {
  output: 'standalone',
  eslint: {
    dirs: ['src'],
  },

  reactStrictMode: false,
  swcMinify: false, // 禁用 SWC minify 以修复 Cloudflare Workers 的 __name 错误

  // Uncoment to add domain whitelist
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  webpack(config, { isServer }) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: { not: /\.(css|scss|sass)$/ },
        resourceQuery: { not: /url/ }, // exclude if *.svg?url
        loader: '@svgr/webpack',
        options: {
          dimensions: false,
          titleProp: true,
        },
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      crypto: false,
    };

    // 修复 Cloudflare Workers 的 __name is not defined 错误
    // 禁用 esbuild 的 keepNames，避免生成 __name 辅助函数
    if (config.optimization && config.optimization.minimizer) {
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = minimizer.options.terserOptions || {};
          minimizer.options.terserOptions.keep_fnames = false;
        }
        if (minimizer.constructor.name === 'EsbuildPlugin') {
          minimizer.options.keepNames = false;
        }
      });
    }

    return config;
  },
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);

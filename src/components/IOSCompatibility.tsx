'use client';

import { useEffect, useState } from 'react';

interface IOSCompatibilityProps {
  children: React.ReactNode;
}

export function IOSCompatibility({ children }: IOSCompatibilityProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // 检测iOS设备
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 检测Safari浏览器
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setIsSafari(safari);

    // 如果是iOS Safari，添加特定的CSS类
    if (iOS && safari) {
      document.documentElement.classList.add('ios-safari');
      document.body.classList.add('ios-safari');
    }

    // 清理函数
    return () => {
      document.documentElement.classList.remove('ios-safari');
      document.body.classList.remove('ios-safari');
    };
  }, []);

  // 如果是iOS Safari，应用特定的样式优化
  useEffect(() => {
    if (isIOS && isSafari) {
      // 禁用一些可能导致性能问题的CSS属性
      const style = document.createElement('style');
      style.textContent = `
        .ios-safari * {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        
        .ios-safari .animate-pulse {
          animation: none !important;
        }
        
        .ios-safari .particle {
          animation: none !important;
          opacity: 0.4 !important;
        }
        
        .ios-safari .shape {
          animation: none !important;
          opacity: 0.2 !important;
        }
        
        .ios-safari .logo-background-glow {
          animation: none !important;
        }
        
        .ios-safari .main-v0tv-logo {
          animation: none !important;
        }
        
        .ios-safari .v0tv-logo {
          animation: none !important;
        }
        
        .ios-safari .bottom-logo {
          animation: none !important;
        }
        
        .ios-safari .backdrop-blur-xl {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        
        .ios-safari .bg-white\\/90 {
          background-color: rgba(255, 255, 255, 0.95) !important;
        }
        
        .ios-safari .dark .bg-zinc-900\\/90 {
          background-color: rgba(24, 24, 27, 0.95) !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isIOS, isSafari]);

  return <>{children}</>;
}

export default IOSCompatibility;

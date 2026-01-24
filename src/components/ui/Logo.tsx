'use client';

// 主内容区大型 V0TV Logo 组件
export function MainLogo() {
  return (
    <div className='main-logo-container'>
      {/* 背景光效 */}
      <div className='logo-background-glow'></div>

      {/* 主 Logo */}
      <div className='main-v0tv-logo'>V0TV</div>

      {/* 副标题 */}
      <div className='mt-3 text-center'>
        <div className='main-logo-subtitle'>极致影视体验，尽在指尖</div>
      </div>

      {/* 装饰性粒子效果 */}
      <div className='logo-particles'>
        <div className='particle particle-1'></div>
        <div className='particle particle-2'></div>
        <div className='particle particle-3'></div>
        <div className='particle particle-4'></div>
        <div className='particle particle-5'></div>
        <div className='particle particle-6'></div>
      </div>
    </div>
  );
}

// V0TV 底部 Logo 组件
export function BottomLogo() {
  return (
    <div className='bottom-logo-container'>
      {/* 浮动几何形状装饰 */}
      <div className='floating-shapes'>
        <div className='shape'></div>
        <div className='shape'></div>
        <div className='shape'></div>
        <div className='shape'></div>
      </div>

      <div className='text-center'>
        <div className='bottom-logo'>V0TV</div>
        <div className='mt-2 text-sm text-gray-500 dark:text-gray-400 opacity-75'>
          Powered by V0TV Core
        </div>
      </div>
    </div>
  );
}

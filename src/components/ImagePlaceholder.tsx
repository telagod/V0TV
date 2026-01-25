// 图片占位符组件 - Netflix 深色主题骨架屏
const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full ${aspectRatio} rounded-md`}
    style={{
      background:
        'linear-gradient(90deg, #2a2a2a 25%, #333333 50%, #2a2a2a 75%)',
      backgroundSize: '200% 100%',
      animation: 'shine 1.5s infinite',
    }}
  >
    <style>{`
      @keyframes shine {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

export { ImagePlaceholder };

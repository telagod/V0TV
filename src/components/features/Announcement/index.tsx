'use client';

interface AnnouncementModalProps {
  announcement: string;
  onClose: () => void;
}

export default function AnnouncementModal({
  announcement,
  onClose,
}: AnnouncementModalProps) {
  const handleClose = () => {
    localStorage.setItem('hasSeenAnnouncement', announcement);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-700 ease-cinema'>
      <div className='w-full max-w-md rounded-xl bg-surface-secondary p-6 shadow-xl border border-stroke-primary transform transition-all duration-700 ease-cinema'>
        <div className='flex justify-between items-start mb-4'>
          <h3 className='text-2xl font-serif font-bold tracking-tight text-content-primary border-b border-accent/40 pb-1'>
            提示
          </h3>
          <button
            onClick={handleClose}
            className='text-content-tertiary hover:text-content-primary transition-colors'
            aria-label='关闭'
          />
        </div>
        <div className='mb-6'>
          <div className='relative overflow-hidden rounded-lg mb-4 bg-accent/[0.08]'>
            <div className='absolute inset-y-0 left-0 w-1.5 bg-accent' />
            <p className='ml-4 text-content-secondary leading-relaxed'>
              {announcement}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className='w-full rounded-lg bg-accent hover:bg-accent-hover text-surface-primary px-4 py-3 font-medium shadow-md hover:shadow-lg transition-all duration-700 ease-cinema'
        >
          我知道了
        </button>
      </div>
    </div>
  );
}

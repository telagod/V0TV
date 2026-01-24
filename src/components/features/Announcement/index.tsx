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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300'>
      <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'>
        <div className='flex justify-between items-start mb-4'>
          <h3 className='text-2xl font-bold tracking-tight text-gray-800 dark:text-white border-b border-purple-500 pb-1'>
            提示
          </h3>
          <button
            onClick={handleClose}
            className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors'
            aria-label='关闭'
          />
        </div>
        <div className='mb-6'>
          <div className='relative overflow-hidden rounded-lg mb-4 bg-purple-50 dark:bg-purple-900/20'>
            <div className='absolute inset-y-0 left-0 w-1.5 bg-purple-500 dark:bg-purple-400' />
            <p className='ml-4 text-gray-600 dark:text-gray-300 leading-relaxed'>
              {announcement}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className='w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg hover:from-purple-700 hover:to-purple-800 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 transition-all duration-300 transform hover:-translate-y-0.5'
        >
          我知道了
        </button>
      </div>
    </div>
  );
}

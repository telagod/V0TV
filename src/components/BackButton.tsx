import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-content-secondary hover:bg-surface-hover transition-colors'
      aria-label='Back'
    >
      <ArrowLeft className='w-full h-full' />
    </button>
  );
}

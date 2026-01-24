'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

type DialogType = 'info' | 'success' | 'warning' | 'error';

interface ConfirmDialogOptions {
  title: string;
  message: string | React.ReactNode;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmDialogOptions, 'showCancel'>) => Promise<void>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(
  null,
);

const iconMap = {
  info: <Info className='h-6 w-6 text-blue-500' />,
  success: <CheckCircle className='h-6 w-6 text-green-500' />,
  warning: <AlertTriangle className='h-6 w-6 text-yellow-500' />,
  error: <XCircle className='h-6 w-6 text-red-500' />,
};

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(
    null,
  );

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({ showCancel: true, ...opts });
      setResolver(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback(
    (opts: Omit<ConfirmDialogOptions, 'showCancel'>): Promise<void> => {
      return new Promise((resolve) => {
        setOptions({ ...opts, showCancel: false });
        setResolver(() => () => resolve());
        setIsOpen(true);
      });
    },
    [],
  );

  const handleClose = (confirmed: boolean) => {
    setIsOpen(false);
    resolver?.(confirmed);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}
      <Dialog open={isOpen} onClose={() => handleClose(false)}>
        <DialogBackdrop className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50' />
        <div className='fixed inset-0 flex items-center justify-center p-4 z-50'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl'>
            {options && (
              <>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0'>
                    {iconMap[options.type || 'info']}
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                      {options.title}
                    </h3>
                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                      {typeof options.message === 'string' ? (
                        <p>{options.message}</p>
                      ) : (
                        options.message
                      )}
                    </div>
                  </div>
                </div>
                <div className='mt-6 flex justify-end gap-3'>
                  {options.showCancel !== false && (
                    <button
                      onClick={() => handleClose(false)}
                      className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                    >
                      {options.cancelText || '取消'}
                    </button>
                  )}
                  <button
                    onClick={() => handleClose(true)}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                      options.type === 'error' || options.type === 'warning'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {options.confirmText || '确定'}
                  </button>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      'useConfirmDialog must be used within ConfirmDialogProvider',
    );
  }
  return context;
}

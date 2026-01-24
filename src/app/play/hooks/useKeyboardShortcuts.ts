/**
 * useKeyboardShortcuts Hook
 * 管理键盘快捷键
 */

import { useEffect } from 'react';

import type { KeyboardShortcut } from '../types/player.types';

/**
 * 键盘快捷键Hook
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果在输入框中，不处理快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // 查找匹配的快捷键
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const altMatch =
          shortcut.altKey === undefined || event.altKey === shortcut.altKey;
        const ctrlMatch =
          shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatch =
          shortcut.shiftKey === undefined ||
          event.shiftKey === shortcut.shiftKey;

        if (keyMatch && altMatch && ctrlMatch && shiftMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

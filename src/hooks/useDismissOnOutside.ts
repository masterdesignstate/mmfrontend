import { useEffect, type RefObject } from 'react';

/**
 * Close a popover when the user clicks, taps or presses Escape outside of it.
 *
 * Listens on `pointerdown` rather than `mousedown` so a touch dismisses the menu on the
 * first tap — on a phone `mousedown` only arrives as part of the synthesised click, which
 * fires too late and on the wrong target.
 *
 * @param ref     wrapper around both the trigger and the panel, so clicking the trigger
 *                again is left to its own toggle instead of being treated as "outside".
 * @param isOpen  skip the listeners entirely while the popover is closed.
 * @param onClose called when the user clicks away or presses Escape.
 */
export function useDismissOnOutside(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && ref.current && !ref.current.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isOpen, onClose]);
}

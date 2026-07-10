/* ═══════════════════════════════════════════════════════════
   useAdminSecret — listens for Ctrl + Shift + K globally
   When triggered, calls the onTrigger callback.
   No UI element is shown anywhere on the site.
═══════════════════════════════════════════════════════════ */
import { useEffect } from 'react';

export function useAdminSecret(onTrigger) {
  useEffect(() => {
    function handler(e) {
      // Ctrl + Shift + K
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        onTrigger();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTrigger]);
}

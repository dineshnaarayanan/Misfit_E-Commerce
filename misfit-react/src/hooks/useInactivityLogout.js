/* ═══════════════════════════════════════════════════════════
   useInactivityLogout — auto-logout admin after N minutes
   of mouse/keyboard inactivity
═══════════════════════════════════════════════════════════ */
import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutes
const WARNING_MS    =  2 * 60 * 1000; // warn 2 min before

export function useInactivityLogout(onLogout, onWarning) {
  const logoutTimer  = useRef(null);
  const warningTimer = useRef(null);

  const reset = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);

    warningTimer.current = setTimeout(() => {
      onWarning?.('You will be logged out in 2 minutes due to inactivity.');
    }, INACTIVITY_MS - WARNING_MS);

    logoutTimer.current = setTimeout(() => {
      onLogout?.();
    }, INACTIVITY_MS);
  }, [onLogout, onWarning]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the timer

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(logoutTimer.current);
      clearTimeout(warningTimer.current);
    };
  }, [reset]);
}

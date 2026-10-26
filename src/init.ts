// Client-side initialization: iOS detection, theme preference, mobile UI scale, and scroll optimizations
import { applyMobileUiScale, readMobileUiScale } from './utils/mobileUiScale';
import { initializeMobileUiScale } from './services/mobileUiScale';

// Apply the locally-cached scale immediately so the very first paint already uses it.
// The global bootstrap below updates it as soon as the account preference is known.
applyMobileUiScale(readMobileUiScale());

// Start the global preference bootstrap (session-aware). `main.tsx` awaits this
// promise before the first render so a saved scale is active without having to
// open the settings page.
export const mobileUiScaleReady: Promise<void> = initializeMobileUiScale();

try {
  const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS) {
    document.documentElement.classList.add('ios');
  }
} catch (_) {}

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return 'dark';
    }
  } catch (_) {}
  return 'light';
}

function applyTheme(theme: string) {
  try {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {}
}

// Apply initial theme immediately
applyTheme(getInitialTheme());

// Listen for system theme changes
try {
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      } catch (_) {}
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handler);
    }
  }
} catch (_) {}

// Optimize scrolling performance
try {
  const addScrollOptimizations = () => {
    try {
      const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-x-auto');
      scrollableElements.forEach(element => {
        (element as HTMLElement).style.setProperty('-webkit-overflow-scrolling', 'touch');
      });
    } catch (_) {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addScrollOptimizations);
  } else {
    addScrollOptimizations();
  }
} catch (_) {}

// Register Service Worker for PWA and Web Push Notifications
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch((err) => {
          console.warn('[PWA] Service Worker registration warning:', err);
        });
    });
  }
} catch (_) {}


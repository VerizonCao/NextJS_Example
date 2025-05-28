'use client';

import { useEffect } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_TIME || process.env.VERCEL_GIT_COMMIT_SHA || '';

export function VersionCheck() {
  useEffect(() => {
    if (!BUILD_ID) return;

    const stored = localStorage.getItem('build_id');
    if (stored && stored !== BUILD_ID) {
      window.location.reload();
    } else {
      localStorage.setItem('build_id', BUILD_ID);
    }
  }, []);

  return null;
} 
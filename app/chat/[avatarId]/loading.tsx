'use client';

import { useSearchParams } from 'next/navigation';
import { Loading } from './components/LoadingStates';

export default function LoadingPage() {
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get('mode') === 'video';

  return <Loading isVideoMode={isVideoMode} />;
} 
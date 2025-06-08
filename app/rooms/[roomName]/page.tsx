import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';


export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    region?: string;
    hq?: string;
    codec?: string;
    returnPath?: string;
    presignedUrl?: string;
    prompt?: string;
    scene?: string;
    bio?: string;
    avatar_name?: string;
    avatar_id?: string;
  }>;
}) {
  // Await both params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const codec =
    typeof resolvedSearchParams.codec === 'string' && isVideoCodec(resolvedSearchParams.codec)
      ? resolvedSearchParams.codec
      : 'vp9';
  const hq = resolvedSearchParams.hq === 'true' ? true : false;

  return (
    <PageClientImpl 
      roomName={resolvedParams.roomName} 
      region={resolvedSearchParams.region} 
      hq={hq} 
      codec={codec}
      returnPath={resolvedSearchParams.returnPath}
      presignedUrl={resolvedSearchParams.presignedUrl}
      prompt={resolvedSearchParams.prompt}
      scene={resolvedSearchParams.scene}
      bio={resolvedSearchParams.bio}
      avatar_name={resolvedSearchParams.avatar_name}
      avatar_id={resolvedSearchParams.avatar_id}
    />
  );
}

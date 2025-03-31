import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';

// export default async function Page({
//   params,
//   searchParams,
// }: {
//   params: { roomName: string };
//   searchParams: {
//     // FIXME: We should not allow values for regions if in playground mode.
//     region?: string;
//     hq?: string;
//     codec?: string;
//   };
// }) {

//   // damn wait here 
//   const searchParamsWaited = await searchParams;
//   const paramsWaited = await params;

//   const codec =
//     typeof searchParamsWaited.codec === 'string' && isVideoCodec(searchParamsWaited.codec)
//       ? searchParamsWaited.codec
//       : 'vp9';
//   const hq = searchParamsWaited.hq === 'true' ? true : false;


//   return (
//     <PageClientImpl roomName={paramsWaited.roomName} region={searchParamsWaited.region} hq={hq} codec={codec} />
//   );
// }


export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    region?: string;
    hq?: string;
    codec?: string;
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
    />
  );
}

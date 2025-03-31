import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';

export default async function Page({
  params,
  searchParams,
}: {
  params: { roomName: string };
  searchParams: {
    // FIXME: We should not allow values for regions if in playground mode.
    region?: string;
    hq?: string;
    codec?: string;
  };
}) {

  // damn wait here 
  const searchParamsWaited = await searchParams;
  const paramsWaited = await params;


  // const codec =
  //   typeof searchParams.codec === 'string' && isVideoCodec(searchParams.codec)
  //     ? searchParams.codec
  //     : 'vp9';
  // const hq = searchParams.hq === 'true' ? true : false;


  const codec =
    typeof searchParamsWaited.codec === 'string' && isVideoCodec(searchParamsWaited.codec)
      ? searchParamsWaited.codec
      : 'vp9';
  const hq = searchParamsWaited.hq === 'true' ? true : false;


  // return (
  //   <PageClientImpl roomName={params.roomName} region={searchParams.region} hq={hq} codec={codec} />
  // );

  return (
    <PageClientImpl roomName={paramsWaited.roomName} region={searchParamsWaited.region} hq={hq} codec={codec} />
  );
}

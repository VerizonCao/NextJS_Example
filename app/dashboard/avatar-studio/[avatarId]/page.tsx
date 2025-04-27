import { Metadata } from 'next'
import AvatarStudio from './AvatarStudio'
import { use } from 'react'

export const metadata: Metadata = {
  title: 'Avatar Studio',
  description: 'Create and customize your avatar',
}

interface AvatarStudioPageProps {
  params: Promise<{
    avatarId: string
  }>
  searchParams: Promise<{
    avatar_uri?: string
  }>
}

export default function AvatarStudioPage({ params, searchParams }: AvatarStudioPageProps) {
  const { avatarId } = use(params);
  const { avatar_uri } = use(searchParams);
  const decodedAvatarUri = avatar_uri ? decodeURIComponent(avatar_uri) : undefined;
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Avatar Studio - {avatarId}</h1>
      <AvatarStudio avatarId={avatarId} avatarUri={decodedAvatarUri} />
    </div>
  )
} 
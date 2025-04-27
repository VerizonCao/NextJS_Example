import { Metadata } from 'next'
import AvatarStudio from './AvatarStudio'

export const metadata: Metadata = {
  title: 'Avatar Studio',
  description: 'Create and customize your avatar',
}

interface AvatarStudioPageProps {
  params: {
    avatarId: string
  }
  searchParams: {
    avatar_uri?: string
  }
}

export default function AvatarStudioPage({ params, searchParams }: AvatarStudioPageProps) {
  const decodedAvatarUri = searchParams.avatar_uri ? decodeURIComponent(searchParams.avatar_uri) : undefined;
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Avatar Studio - {params.avatarId}</h1>
      <AvatarStudio avatarId={params.avatarId} avatarUri={decodedAvatarUri} />
    </div>
  )
} 
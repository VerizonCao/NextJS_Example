import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import Image from 'next/image';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-6 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
        <div className="flex flex-col items-center gap-6 text-center max-w-3xl">
          <h1 className={`${lusitana.className} text-5xl font-bold text-purple-900`}>
            Welcome to Rita
          </h1>
          <p className="text-xl text-gray-600">
            Your next-generation AI companion platform. Experience the future of digital interaction.
          </p>
          <div className="flex gap-4 mt-4">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              <span>Get Started</span>
              <ArrowRightIcon className="w-5" />
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 rounded-lg border border-purple-600 px-6 py-3 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50"
            >
              Learn More
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
            <Image
              src="/rita-avatars-test/girl_white.png"
              alt="Rita Avatar"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
            <Image
              src="/rita-avatars-test/girl_red.png"
              alt="Rita Avatar"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
            <Image
              src="/rita-avatars-test/mingren.png"
              alt="Rita Avatar"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
            <Image
              src="/rita-avatars-test/tifa_3.png"
              alt="Rita Avatar"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500">
            Choose from a variety of avatars to personalize your Rita experience
          </p>
        </div>
      </div>
    </main>
  );
}

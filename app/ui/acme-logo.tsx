import { lusitana } from '@/app/ui/fonts';
import Image from 'next/image';

export default function AcmeLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center leading-none text-white`}
    >
      <Image 
        src="/images/Rita Icon.png" 
        alt="Rita Logo" 
        width={64} 
        height={64} 
        className="rotate-[15deg]"
      />
      <p className="text-[44px] ml-4">Rita</p>
    </div>
  );
}

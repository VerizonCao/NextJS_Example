'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { WalletIcon } from 'lucide-react';
import { checkRunPodHealth, getUserServeCountAction } from '@/app/lib/actions';

export default function SubscriptionButton({ className }: { className?: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const [health, setHealth] = useState<{
    jobs: {
      completed: number;
      failed: number;
      inProgress: number;
      inQueue: number;
      retried: number;
    };
    workers: {
      idle: number;
      initializing: number;
      ready: number;
      running: number;
      throttled: number;
      unhealthy: number;
    };
  } | null>(null);
  const [tokenCount, setTokenCount] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await checkRunPodHealth();
        if (result.success && result.data) {
          setHealth(result.data);
        } else {
          setHealth(null);
        }
      } catch (error) {
        console.error('Error checking RunPod health:', error);
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    const checkTokenCount = async () => {
      if (session?.user?.email) {
        try {
          const result = await getUserServeCountAction(session.user.email);
          if (result.success) {
            setTokenCount(10 - result.count);
          }
        } catch (error) {
          console.error('Error checking token count:', error);
        }
      }
    };

    checkHealth();
    checkTokenCount();
    const healthInterval = setInterval(checkHealth, 10000); // Check every 10 seconds
    const tokenInterval = setInterval(checkTokenCount, 20000); // Check every 20 seconds

    return () => {
      clearInterval(healthInterval);
      clearInterval(tokenInterval);
    };
  }, [session?.user?.email]);

  const handleClick = () => {
    router.push('/subscription');
  };

  const availableWorkers = health?.workers.ready || 0;
  const isHealthy = health?.workers.unhealthy === 0;

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        className={`flex items-center gap-3 px-3 py-3.5 w-full justify-start rounded-lg hover:bg-[#ffffff1a] transition-colors duration-200 group text-[#8f9092] hover:text-white ${className}`}
      >
        <WalletIcon className="w-6 h-6 group-hover:text-white" />
        <span className="font-medium text-base tracking-[-0.32px] leading-5 text-left flex-1 group-hover:text-white [font-family:'Inter',Helvetica]">
          Subscription
        </span>
      </button>
      
      {/* Status Details */}
      {showDetails && (
        <div className="ml-3 mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d1d1e]">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-white">Loading...</span>
            </div>
          ) : (
            <>
              {/* Worker Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d1d1e]">
                <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-white">
                  {availableWorkers} workers available
                </span>
              </div>
              
              {/* Token Status */}
              {session?.user && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d1d1e]">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-white">
                    {tokenCount} tokens left today
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { checkRunPodHealth, getUserServeCountAction } from '@/app/lib/actions';

export default function SubscriptionPage() {
  const { data: session } = useSession();
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

  if (!session) {
    return (
      <div className="min-h-screen bg-[#121214] flex items-center justify-center">
        <div className="text-white text-xl">Please log in to view your subscription</div>
      </div>
    );
  }

  const availableWorkers = health?.workers.ready || 0;
  const isHealthy = health?.workers.unhealthy === 0;

  return (
    <div className="min-h-screen bg-[#121214] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-white text-3xl font-bold mb-8">Subscription</h1>
        
        {/* Current Plan Section */}
        <div className="bg-[#1a1a1e] rounded-lg p-6 mb-8">
          <h2 className="text-white text-xl font-semibold mb-6">Current Plan</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold text-white">Free Plan</div>
            <div className="px-3 py-1 bg-[#22c55e] text-white text-sm rounded-full">Active</div>
          </div>
          <p className="text-gray-400 mb-4">Get started with our free tier</p>
          <div className="text-white">
            <p>• 10 tokens per day</p>
            <p>• Access to basic characters</p>
            <p>• Standard support</p>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Token Usage Card */}
          <div className="bg-[#1a1a1e] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Token Usage</h3>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-600 rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Tokens Remaining</span>
                  <span className="text-white font-medium">{tokenCount}/10</span>
                </div>
                <div className="w-full bg-[#2a2a2e] rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(tokenCount / 10) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Resets daily at midnight UTC</p>
              </div>
            )}
          </div>

          {/* Worker Status Card */}
          <div className="bg-[#1a1a1e] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Service Status</h3>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-600 rounded animate-pulse w-2/3"></div>
              </div>
            ) : health ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-white font-medium">
                    {isHealthy ? 'All Systems Operational' : 'Service Issues Detected'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available Workers:</span>
                    <span className="text-white">{availableWorkers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Running Workers:</span>
                    <span className="text-white">{health.workers.running}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Jobs in Queue:</span>
                    <span className="text-white">{health.jobs.inQueue}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-white">Service Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Section */}
        <div className="bg-[#1a1a1e] rounded-lg p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Upgrade Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pro Plan */}
            <div className="bg-[#2a2a2e] rounded-lg p-6 border border-[#4f46e5]">
              <h4 className="text-white text-lg font-semibold mb-2">Pro Plan</h4>
              <div className="text-2xl font-bold text-white mb-4">$19<span className="text-sm text-gray-400">/month</span></div>
              <ul className="text-gray-300 space-y-2 mb-6">
                <li>• 100 tokens per day</li>
                <li>• Priority processing</li>
                <li>• Advanced characters</li>
                <li>• Priority support</li>
              </ul>
              <button className="w-full bg-[#4f46e5] hover:bg-[#3c34b5] text-white py-2 px-4 rounded-lg transition-colors">
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[#2a2a2e] rounded-lg p-6">
              <h4 className="text-white text-lg font-semibold mb-2">Enterprise</h4>
              <div className="text-2xl font-bold text-white mb-4">$99<span className="text-sm text-gray-400">/month</span></div>
              <ul className="text-gray-300 space-y-2 mb-6">
                <li>• Unlimited tokens</li>
                <li>• Dedicated workers</li>
                <li>• Custom characters</li>
                <li>• 24/7 support</li>
              </ul>
              <button className="w-full bg-[#2a2a2e] hover:bg-[#3a3a3e] text-white py-2 px-4 rounded-lg border border-gray-600 transition-colors">
                Contact Sales
              </button>
            </div>

            {/* Custom Plan */}
            <div className="bg-[#2a2a2e] rounded-lg p-6">
              <h4 className="text-white text-lg font-semibold mb-2">Custom</h4>
              <div className="text-2xl font-bold text-white mb-4">Custom<span className="text-sm text-gray-400"> pricing</span></div>
              <ul className="text-gray-300 space-y-2 mb-6">
                <li>• Custom token limits</li>
                <li>• On-premise deployment</li>
                <li>• Custom integrations</li>
                <li>• Dedicated support</li>
              </ul>
              <button className="w-full bg-[#2a2a2e] hover:bg-[#3a3a3e] text-white py-2 px-4 rounded-lg border border-gray-600 transition-colors">
                Get Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
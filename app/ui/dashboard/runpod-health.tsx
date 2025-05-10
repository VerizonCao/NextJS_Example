'use client';

import { useEffect, useState } from 'react';
import { checkRunPodHealth } from '@/app/lib/actions';

export default function RunPodHealth() {
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

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d1d1e]">
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-sm text-white">Checking...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d1d1e]">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm text-white">Offline</span>
      </div>
    );
  }

  const availableWorkers = health.workers.ready;
  const isHealthy = health.workers.unhealthy === 0;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d1d1e]">
      <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
      <div className="flex flex-col">
        <span className="text-sm text-white">{availableWorkers} workers available</span>
        <span className="text-xs text-gray-400">
          {health.workers.running} running, {health.jobs.inQueue} queued
        </span>
      </div>
    </div>
  );
} 
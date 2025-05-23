import { NextResponse } from 'next/server';
import { flushAllAvatarServeTimesAction } from '@/app/lib/actions';

export async function GET() {
  console.log('Running serve_time API endpoint - flushing avatar serve times');
  
  const results = {
    processed: 0,
    failed: 0,
    details: [] as Array<{avatarId: string, success: boolean, message: string}>
  };
  
  try {
    // Flush all avatar serve times
    const flushResult = await flushAllAvatarServeTimesAction();
    
    if (flushResult.success) {
      results.processed = flushResult.processedCount || 0;
      results.details.push({
        avatarId: 'all',
        success: true,
        message: `Flushed serve times for ${results.processed} avatars`
      });
    } else {
      results.failed = 1;
      results.details.push({
        avatarId: 'all',
        success: false,
        message: flushResult.message || 'Failed to flush serve times'
      });
    }
    
    console.log(`Serve time flush complete. Processed: ${results.processed}, Failed: ${results.failed}`);
    
    // Return a NextResponse with the results
    return NextResponse.json({
      message: 'Serve time flush complete',
      processed: results.processed,
      failed: results.failed,
      details: results.details
    });
    
  } catch (error) {
    console.error('Error flushing avatar serve times:', error);
    return NextResponse.json(
      { 
        message: 'Error flushing avatar serve times', 
        error: (error as Error).message,
        processed: results.processed,
        failed: results.failed
      },
      { status: 500 }
    );
  }
}
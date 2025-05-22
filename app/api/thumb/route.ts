import { NextResponse } from 'next/server';
import { getNextAvatarThumbnailJobAction, updateAvatarThumbCountAction } from '@/app/lib/actions';

export async function GET() {
  console.log('Running thumb API endpoint - processing thumbnail queue');
  
  const results = {
    processed: 0,
    failed: 0,
    details: [] as Array<{avatarId: string, success: boolean, message: string}>
  };
  
  try {
    // Process all jobs in the queue
    let jobResult = await getNextAvatarThumbnailJobAction();
    
    while (jobResult.success && jobResult.avatarId) {
      const avatarId = jobResult.avatarId;
      // console.log(`Processing thumbnail for avatar: ${avatarId}`);
      
      // Update the thumb count for this avatar
      const updateResult = await updateAvatarThumbCountAction(avatarId);
      
      // Track the result
      if (updateResult.success) {
        results.processed++;
        results.details.push({
          avatarId,
          success: true,
          message: `Updated thumb count to ${updateResult.thumbCount}`
        });
      } else {
        results.failed++;
        results.details.push({
          avatarId,
          success: false,
          message: updateResult.message
        });
      }
      
      // Get the next job
      jobResult = await getNextAvatarThumbnailJobAction();
    }
    
    console.log(`Thumbnail processing complete. Processed: ${results.processed}, Failed: ${results.failed}`);
    
    // Return a NextResponse with the results
    return NextResponse.json({
      message: 'Thumbnail processing complete',
      processed: results.processed,
      failed: results.failed,
      details: results.details
    });
    
  } catch (error) {
    console.error('Error processing thumbnail queue:', error);
    return NextResponse.json(
      { 
        message: 'Error processing thumbnail queue', 
        error: (error as Error).message,
        processed: results.processed,
        failed: results.failed
      },
      { status: 500 }
    );
  }
}
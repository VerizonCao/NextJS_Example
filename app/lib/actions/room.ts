'use server';

import { RoomServiceClient } from 'livekit-server-sdk';
import { getUserByIdEmail, findUserPreviousRoom } from '../data';

/**
 * Server action to remove a participant from a LiveKit room
 */
export async function removeParticipant(roomName: string, identity: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    
    await roomService.removeParticipant(roomName, identity);
    
    return { 
      success: true, 
      message: 'Participant removed successfully' 
    };
  } catch (error: any) {
    console.error('Error removing participant:', error);
    
    // Handle the case where participant is not found
    if (error.status === 404 && error.code === 'not_found') {
      return {
        success: true,
        message: 'Participant was already removed or not found'
      };
    }
    
    return { 
      success: false, 
      message: 'Failed to remove participant' 
    };
  }
}

/**
 * Server action to delete a user's previous room if it exists
 */
export async function deleteUserPreviousRoomAction(userEmail: string, room_name: string) {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      console.error('User not found for email:', userEmail);
      return;
    }

    const roomId = await findUserPreviousRoom(userId);
    if (!roomId) {
      return; // No previous room found, nothing to do
    }

    // Only delete if the room IDs don't match
    if (roomId === room_name) {
      console.log(`Room "${roomId}" matches current room, skipping deletion.`);
      return;
    }

    // Delete the room from LiveKit
    try {
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!
      );
      
      await roomService.deleteRoom(roomId);
      console.log(`Room "${roomId}" deleted successfully.`);
    } catch (error) {
      console.error(`Failed to delete room "${roomId}":`, error);
    }
  } catch (error) {
    console.error('Error in deleteUserPreviousRoomAction:', error);
  }
} 
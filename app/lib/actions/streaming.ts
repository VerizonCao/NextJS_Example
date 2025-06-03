'use server';

import { getUserServeCountAction, incrementUserServeCountAction, getUserPreferredNameAction } from '@/app/lib/actions/user';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export async function startStreamingSession({
  instruction,
  seconds,
  room = "my-room",
  avatarSource = "",
  avatar_id = null,
  llmUserNickname = null,
  llmUserBio = null,
  llmAssistantNickname = null,
  llmAssistantBio = null,
  llmAssistantAdditionalCharacteristics = null,
  llmConversationContext = null,
  ttsVoiceIdCartesia = null,
  userEmail = null,
}: {
  instruction: string;
  seconds: number;
  room?: string;
  avatarSource?: string;
  avatar_id?: string | null;
  llmUserNickname?: string | null;
  llmUserBio?: string | null;
  llmAssistantNickname?: string | null;
  llmAssistantBio?: string | null;
  llmAssistantAdditionalCharacteristics?: string | null;
  llmConversationContext?: string | null;
  ttsVoiceIdCartesia?: string | null;
  userEmail?: string | null;
}) {
  try {
    // Initialize AWS Lambda client
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

    // Invoke Lambda function
    const lambdaCommand = new InvokeCommand({
      FunctionName: "llm-handler",
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ room_name: room })),
    });

    try {
      await lambdaClient.send(lambdaCommand);
      console.log("Lambda invocation succeeded for room:", room);
    } catch (lambdaError) {
      console.error("Lambda invocation failed:", lambdaError);
      // Continue with the rest of the function even if Lambda fails
    }

    // Check user's serve count if email is provided
    if (userEmail) {
      const { success, count } = await getUserServeCountAction(userEmail);
      if (success && count >= 10) {
        return { 
          success: false, 
          message: 'Maximum serve count reached',
          error: 'LIMIT_REACHED',
          currentCount: count,
          maxCount: 10
        };
      }

      // Check if user has a preferred name
      const { success: nameSuccess, preferredName } = await getUserPreferredNameAction(userEmail);
      if (nameSuccess && preferredName) {
        llmUserNickname = preferredName;
      }
    }

    const input: Record<string, any> = {
      instruction,
      seconds,
      room,
      avatarSource,
    };

    // Only add fields that are not null
    if (avatar_id !== null) input.avatar_id = avatar_id;
    if (llmUserNickname !== null) input.llm_user_nickname = llmUserNickname;
    if (llmUserBio !== null) input.llm_user_bio = llmUserBio;
    if (llmAssistantNickname !== null) input.llm_assistant_nickname = llmAssistantNickname;
    if (llmAssistantBio !== null) input.llm_assistant_bio = llmAssistantBio;
    if (llmAssistantAdditionalCharacteristics !== null) input.llm_assistant_additional_characteristics = llmAssistantAdditionalCharacteristics;
    if (llmConversationContext !== null) input.llm_conversation_context = llmConversationContext;
    if (ttsVoiceIdCartesia !== null) input.tts_voice_id_cartesia = ttsVoiceIdCartesia;

    const response = await fetch('https://api.runpod.ai/v2/ig6zqibcn2nc8b/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.RUNPOD_API_KEY || '',
      },
      body: JSON.stringify({ input }),
    });

    const data = await response.json();
    console.log('Streaming session completed:', data);

    // Increment user's serve count if email is provided
    if (userEmail) {
      const { newCount } = await incrementUserServeCountAction(userEmail);
      return {
        ...data,
        success: true,
        currentCount: newCount,
        maxCount: 6
      };
    }

    return data;
  } catch (error) {
    console.error('Error in streaming session:', error);
    throw error;
  }
}

/**
 * Server action to check RunPod endpoint health status
 */
export async function checkRunPodHealth(): Promise<{ 
  success: boolean; 
  data: {
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
  } | null;
  message: string;
}> {
  try {
    const { RUNPOD_API_KEY, ENDPOINT_ID } = process.env;
    
    if (!RUNPOD_API_KEY || !ENDPOINT_ID) {
      console.error('Missing RunPod configuration:', { 
        hasApiKey: !!RUNPOD_API_KEY, 
        hasEndpointId: !!ENDPOINT_ID 
      });
      return { 
        success: false, 
        data: null, 
        message: 'Missing RunPod configuration' 
      };
    }

    const response = await fetch(`https://api.runpod.ai/v2/${ENDPOINT_ID}/health`, {
      headers: {
        'Authorization': RUNPOD_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RunPod health check failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch RunPod health: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate the response structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid RunPod health response:', data);
      throw new Error('Invalid RunPod health response format');
    }

    // Ensure we have the expected structure with default values
    const jobs = data.jobs || {};
    const workers = data.workers || {};
    
    return {
      success: true,
      data: {
        jobs: {
          completed: Number(jobs.completed) || 0,
          failed: Number(jobs.failed) || 0,
          inProgress: Number(jobs.inProgress) || 0,
          inQueue: Number(jobs.inQueue) || 0,
          retried: Number(jobs.retried) || 0,
        },
        workers: {
          idle: Number(workers.idle) || 0,
          initializing: Number(workers.initializing) || 0,
          ready: Number(workers.ready) || 0,
          running: Number(workers.running) || 0,
          throttled: Number(workers.throttled) || 0,
          unhealthy: Number(workers.unhealthy) || 0,
        },
      },
      message: 'Health check completed successfully'
    };
  } catch (error) {
    console.error('Error checking RunPod health:', error);
    return { 
      success: false, 
      data: null, 
      message: error instanceof Error ? error.message : 'Failed to check RunPod health' 
    };
  }
} 
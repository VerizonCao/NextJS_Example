'use server';

/**
 * Server action to retrieve voice data from Cartesia API
 */
export async function getCartesiaVoices(
  gender: string, 
  limit: number,
  is_starred: boolean
): Promise<{ 
  success: boolean; 
  voices: any[] | null; 
  message: string,
}> {
  try {
    const response = await fetch(`https://api.cartesia.ai/voices/?limit=${limit}&is_starred=${is_starred}&gender=${gender}&is_owner=false`, {
      method: 'GET',
      headers: {
        'Cartesia-Version': '2024-11-13',
        'X-API-Key': process.env.CARTESIA_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error fetching voices:', response.status, errorData);
      return { 
        success: false, 
        voices: null, 
        message: `Failed to fetch voices: ${response.status} ${response.statusText}` 
      };
    }

    const data = await response.json();
    console.log("voice return data is", data);
    
    return { 
      success: true, 
      voices: data.data, 
      message: 'Voices retrieved successfully' 
    };
  } catch (error) {
    console.error('Error in getCartesiaVoices action:', error);
    return { 
      success: false, 
      voices: null, 
      message: 'An error occurred while retrieving voices' 
    };
  }
}

/**
 * Server action to clone a voice using Cartesia API
 */
export async function cloneVoice(formData: FormData): Promise<{ 
  success: boolean; 
  voice_id: string | null; 
  message: string;
  error?: string;
}> {
  try {
    const file = formData.get('file') as File;
    
    if (!file) {
      return { 
        success: false, 
        voice_id: null, 
        message: 'No file provided',
        error: 'NO_FILE'
      };
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create FormData for Cartesia API
    const cartesiaFormData = new FormData();
    cartesiaFormData.append('clip', new Blob([buffer], { type: file.type }), file.name);
    cartesiaFormData.append('name', 'Cloned Voice');
    cartesiaFormData.append('language', 'en');
    cartesiaFormData.append('description', 'Voice cloned from user upload');

    // Call Cartesia API
    const response = await fetch('https://api.cartesia.ai/voices/clone', {
      method: 'POST',
      headers: {
        'Cartesia-Version': '2025-04-16',
        'Authorization': `Bearer ${process.env.CARTESIA_API_KEY}`,
      },
      body: cartesiaFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cartesia API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return {
        success: false,
        voice_id: null,
        message: `Failed to clone voice: ${response.status} ${response.statusText}`,
        error: errorData.message || 'API_ERROR'
      };
    }

    const data = await response.json();
    return { 
      success: true, 
      voice_id: data.id,
      message: 'Voice cloned successfully' 
    };
  } catch (error) {
    console.error('Error cloning voice:', error);
    return { 
      success: false, 
      voice_id: null, 
      message: error instanceof Error ? error.message : 'Failed to clone voice',
      error: 'UNKNOWN_ERROR'
    };
  }
} 
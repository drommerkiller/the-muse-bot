/**
 * Utility to securely get the Gemini API key
 */

/**
 * Fetches a secure API key from the server or environment
 * In development: Uses environment variable directly
 * In production: Fetches from secure API endpoint
 */
export async function getSecureApiKey(): Promise<string> {
  console.log('🔑 Getting API key');

  // For local development, use the environment variable directly
  if (import.meta.env.DEV) {
    console.log('🔧 Using local environment variable (DEV mode)');
    const localApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!localApiKey) {
      console.error('❌ VITE_GEMINI_API_KEY not found in environment');
      throw new Error('API key not configured in local environment');
    }
    
    return localApiKey;
  }
  
  // For production, use the secure API endpoint
  console.log('🔄 Using secure API endpoint (PRODUCTION)');
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('📥 Response received:', { 
      status: response.status, 
      ok: response.ok
    });

    if (!response.ok) {
      console.error('❌ API key fetch failed:', response.status);
      throw new Error(`Failed to get API key: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.apiKey) {
      console.error('❌ No API key in response');
      throw new Error('API key not found in response');
    }
    
    return data.apiKey;
  } catch (error) {
    console.error('🚨 Error getting secure API key:', error);
    throw error;
  }
} 
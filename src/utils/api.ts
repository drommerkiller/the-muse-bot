/**
 * API utilities for interacting with AI services
 */

/**
 * Interface for the Gemini API request
 */
interface GeminiRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interface for the Gemini API response
 */
interface GeminiResponse {
  text: string;
  model: string;
}

/**
 * Generates content using Gemini API
 * - In development: Uses environment variable directly with Google's API
 * - In production: Uses the proxy API endpoint
 */
export async function generateWithGemini(
  request: GeminiRequest
): Promise<string> {
  console.log('🔄 Generating content with Gemini', {
    prompt: request.prompt.substring(0, 50) + '...',
    model: request.model
  });

  // For local development, use the API directly
  if (import.meta.env.DEV) {
    console.log('🔧 Using direct API call (DEV mode)');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY not found in environment');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: request.model || 'gemini-1.0-pro',
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 1024,
      }
    });
    
    const result = await model.generateContent(request.prompt);
    const response = await result.response;
    return response.text();
  }
  
  // For production, use the proxy API endpoint
  console.log('🔄 Using proxy API endpoint (PRODUCTION)');
  try {
    const baseUrl = window.location.origin;
    const apiEndpoint = `${baseUrl}/api/gemini`;
    console.log('📍 API Endpoint:', apiEndpoint);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    console.log('📥 Response received:', { 
      status: response.status, 
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ API request failed:', response.status, response.statusText, errorText);
      throw new Error(`Failed to generate content: ${response.status}`);
    }

    const data = await response.json() as GeminiResponse;
    console.log('✅ Content successfully generated');
    return data.text;
  } catch (error) {
    console.error('🚨 Error generating content:', error);
    throw error;
  }
};

/**
 * Legacy function - maintained for compatibility
 * @deprecated Use generateWithGemini instead
 */
export async function getSecureApiKey(): Promise<string> {
  console.warn('⚠️ getSecureApiKey is deprecated, use generateWithGemini instead');
  
  if (import.meta.env.DEV) {
    const localApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!localApiKey) {
      throw new Error('API key not configured in local environment');
    }
    return localApiKey;
  }
  
  throw new Error('This function is deprecated in production. Use generateWithGemini instead.');
}
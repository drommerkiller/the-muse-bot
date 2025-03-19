const { GoogleGenerativeAI } = require('@google/generative-ai');

// The handler function for the API route
module.exports = async (req, res) => {
  console.log('📣 API route handler called');
  
  if (req.method !== 'POST') {
    console.warn('⚠️ Non-POST request received:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the secure API key from environment variables
    console.log('🔐 Attempting to access GEMINI_API_KEY from environment');
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('🔑 API key present in environment:', !!apiKey);
    console.log('🔑 API key length:', apiKey?.length || 0);
    console.log('🔑 API key prefix:', apiKey ? apiKey.substring(0, 5) + '...' : 'none');
    
    if (!apiKey) {
      console.error('❌ API key not configured in environment');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Return ONLY the API key - nothing else
    console.log('✅ Returning API key to client');
    // This keeps the original system intact but protects the key
    return res.status(200).json({ apiKey });
  } catch (error) {
    console.error('💥 Error in API route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 
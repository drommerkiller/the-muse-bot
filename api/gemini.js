const { GoogleGenerativeAI } = require('@google/generative-ai');

// Simple in-memory rate limiting
// For production-scale, consider using Redis or a dedicated service
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute
const requestLog = {};

// Handle rate limiting based on IP
const isRateLimited = (ip) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Initialize or clean old requests
  requestLog[ip] = (requestLog[ip] || []).filter(time => time > windowStart);
  
  // Check if rate limit exceeded
  if (requestLog[ip].length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  // Record this request
  requestLog[ip].push(now);
  return false;
};

// The handler function for the API route
module.exports = async (req, res) => {
  console.log('📣 API route handler called');
  
  // 1. Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Origin validation
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    // Vercel deployment URL (replace with your actual domain)
    'https://your-app-domain.vercel.app',
    // Allow any localhost URL
    /^https?:\/\/localhost(:\d+)?$/
  ];
  
  const isOriginAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });

  // In development, be more permissive with CORS
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment && !isOriginAllowed) {
    return res.status(403).json({ error: 'Forbidden: Invalid origin' });
  }

  // 3. Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   'unknown';
                   
  if (isRateLimited(clientIP)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: '60' // Seconds until retry is allowed
    });
  }

  try {
    // 4. Get the secure API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ API key not configured in environment');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // 5. For development ONLY: If GET request and dev mode, verify API key works
    if (req.method === 'GET' && isDevelopment) {
      return res.status(200).json({ 
        message: 'API key is configured correctly',
        environment: process.env.NODE_ENV || 'unknown'
      });
    }

    // 6. Return API key with proper CORS headers
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', isOriginAllowed ? origin : '');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json({ apiKey });
  } catch (error) {
    console.error('💥 Error in API route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 
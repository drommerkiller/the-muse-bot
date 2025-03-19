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

// Origin validation with better support for Vercel preview deployments
const allowedOrigins = [
  // Production URL
  'https://idea-generator-seven.vercel.app',
  // Match any Vercel preview URL for your project
  /^https:\/\/idea-generator-[a-z0-9-]+-silmu\.vercel\.app$/,
  // Allow any localhost URL (for development)
  /^https?:\/\/localhost(:\d+)?$/
];

// Enhanced environment detection
const isProduction = process.env.VERCEL_ENV === 'production';
const isPreview = process.env.VERCEL_ENV === 'preview';
const isDevelopment = process.env.VERCEL_ENV === 'development' || !process.env.VERCEL_ENV;

// More lenient origin checking for non-production environments
const validateOrigin = (origin) => {
  // Always check against allowed origins
  const isOriginAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });
  
  // In production, strictly enforce origin
  if (isProduction) {
    return isOriginAllowed;
  }
  
  // In preview or development, be more lenient
  if (isPreview) {
    // Accept any Vercel preview URL (they all have vercel.app domain)
    return isOriginAllowed || origin.includes('vercel.app');
  }
  
  // In local development, be very permissive
  return true;
}

// This is the Vercel serverless handler
module.exports = async (req, res) => {
  console.log('📣 API route handler called with Vercel environment:', process.env.VERCEL_ENV);
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  
  // 1. Method validation - allow both GET and POST for easier debugging
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Set CORS headers - more permissive to fix deployment issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    // Log all environment variables (safely)
    const envKeys = Object.keys(process.env).filter(key => 
      key.includes('GEMINI') || key.includes('API') || key === 'VERCEL_ENV'
    );
    console.log('Available environment variable keys:', envKeys);
    
    // Try multiple possible environment variable names
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.VITE_GEMINI_API_KEY ||
                   process.env.API_KEY;
    
    if (!apiKey) {
      console.error('❌ API key not configured in environment');
      return res.status(500).json({ 
        error: 'API key not configured',
        checkedVars: envKeys.join(', '),
        env: process.env.VERCEL_ENV || 'unknown'
      });
    }

    // 5. For development ONLY: If GET request and dev mode, verify API key works
    if (req.method === 'GET' && isDevelopment) {
      return res.status(200).json({ 
        message: 'API key is configured correctly',
        environment: process.env.NODE_ENV || 'unknown'
      });
    }

    // 6. Return API key (for both GET and POST)
    return res.status(200).json({ 
      apiKey,
      message: 'API key successfully retrieved'
    });
  } catch (error) {
    console.error('💥 Error in API route:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message
    });
  }
}; 
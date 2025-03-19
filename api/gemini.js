// Import the Google Generative AI library using ES module syntax
import { GoogleGenerativeAI } from '@google/generative-ai';

// Rate limiting setup
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

// Vercel serverless handler using export default (ES module style)
export default async function handler(req, res) {
  console.log('---------- API REQUEST START ----------');
  console.log('Request method:', req.method);
  
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }
  
  // Handle GET requests - useful for testing if the API is reachable
  if (req.method === 'GET') {
    console.log('Handling GET request - health check');
    return res.status(200).json({ 
      status: 'ok',
      message: 'API is running',
      env: process.env.VERCEL_ENV || 'unknown'
    });
  }
  
  // Only proceed with POST requests
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Start main execution
  try {
    console.log('Starting POST request handling');
    
    // Check for API key
    console.log('Checking for API key');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('API key not found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'API key not configured'
      });
    }
    
    console.log('API key found, length:', apiKey.length);
    
    // Parse request body
    let prompt, model;
    try {
      console.log('Parsing request body');
      
      // Check if body exists
      if (!req.body) {
        console.error('Request body is empty');
        return res.status(400).json({ error: 'Missing request body' });
      }
      
      console.log('Request body type:', typeof req.body);
      
      // Handle different body formats
      if (typeof req.body === 'string') {
        const parsedBody = JSON.parse(req.body);
        prompt = parsedBody.prompt;
        model = parsedBody.model;
      } else {
        prompt = req.body.prompt;
        model = req.body.model;
      }
      
      if (!prompt) {
        console.error('No prompt found in request');
        return res.status(400).json({ error: 'Missing prompt in request body' });
      }
      
      console.log('Prompt received, length:', prompt.length);
      console.log('Model requested:', model || 'default');
    } catch (bodyError) {
      console.error('Error parsing request body:', bodyError);
      return res.status(400).json({ 
        error: 'Invalid request body', 
        message: bodyError.message 
      });
    }
    
    // Initialize AI client
    console.log('Initializing GoogleGenerativeAI client');
    let genAI;
    try {
      genAI = new GoogleGenerativeAI(apiKey);
      console.log('GoogleGenerativeAI client initialized successfully');
    } catch (aiInitError) {
      console.error('Error initializing AI client:', aiInitError);
      return res.status(500).json({ 
        error: 'AI initialization failed', 
        message: aiInitError.message 
      });
    }
    
    // Get model
    console.log('Getting generative model');
    let genModel;
    try {
      genModel = genAI.getGenerativeModel({ 
        model: model || 'gemini-1.0-pro'
      });
      console.log('Successfully got generative model');
    } catch (modelError) {
      console.error('Error getting generative model:', modelError);
      return res.status(500).json({ 
        error: 'Model initialization failed', 
        message: modelError.message 
      });
    }
    
    // Generate content
    console.log('Generating content');
    try {
      const result = await genModel.generateContent(prompt);
      console.log('Content generated successfully');
      
      const response = await result.response;
      const text = response.text();
      console.log('Response text extracted, length:', text.length);
      
      console.log('---------- API REQUEST END (SUCCESS) ----------');
      return res.status(200).json({ text, model: model || 'gemini-1.0-pro' });
    } catch (generationError) {
      console.error('Error generating content:', generationError);
      return res.status(500).json({ 
        error: 'Content generation failed', 
        message: generationError.message,
        stack: generationError.stack
      });
    }
  } catch (error) {
    // Catch-all error handler for the entire function
    console.error('Unexpected error in API route:', error);
    console.error('Error stack:', error.stack);
    console.log('---------- API REQUEST END (ERROR) ----------');
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
    });
  }
}
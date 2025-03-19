/**
 * Simple test endpoint for diagnostics
 * Using ES module syntax
 */
export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Get environment info
  const nodeVersion = process.version;
  const environment = process.env.VERCEL_ENV || 'unknown';
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  
  // Gather available environment variables (safely)
  const envVars = Object.keys(process.env)
    .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('TOKEN'))
    .reduce((obj, key) => {
      obj[key] = process.env[key];
      return obj;
    }, {});
  
  // Return diagnostic information
  return res.status(200).json({
    status: 'ok',
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString(),
    nodeVersion,
    environment,
    hasGeminiKey,
    envVars
  });
}
// Simple test endpoint to verify API routes are working
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Simple diagnostic response
  res.status(200).json({
    message: 'API route is working',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'unknown',
    // List environment variables that exist (without values for security)
    envVars: Object.keys(process.env)
      .filter(key => key.includes('GEMINI') || key.includes('API'))
      .map(key => ({
        name: key,
        exists: Boolean(process.env[key]),
        // Don't expose actual values, just a safely masked preview
        preview: process.env[key] ? `${process.env[key].substring(0, 3)}...` : null
      }))
  });
}; 
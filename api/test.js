// Simple test endpoint to verify serverless functions are working
module.exports = async (req, res) => {
  console.log('📣 Test API endpoint called');
  
  // Return a simple test response
  return res.status(200).json({ 
    success: true, 
    message: 'API test endpoint working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  });
}; 
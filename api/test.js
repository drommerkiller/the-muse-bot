// Simple test endpoint to verify serverless functions are working
module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'API route is working',
    timestamp: new Date().toISOString()
  });
}; 

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const { prompt } = req.body || {};

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: "Please enter a video prompt."
    });
  }

  // Backend route is ready, but no AI video provider
  // has been connected yet.
  return res.status(501).json({
    error: "Backend is running, but AI video generation is not connected yet. A compatible AI video API is required."
  });
};
      

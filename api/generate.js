
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST request required"
    });
  }

  const { prompt } = req.body || {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please enter a video prompt."
    });
  }

  return res.status(501).json({
    success: false,
    error: "AI video provider is not connected yet. Please configure an AI video API."
  });
};


const admin = require("firebase-admin");

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      throw new Error("Firebase server credentials are missing.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw))
    });
  }

  return admin;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST request required"
    });
  }

  try {
    const firebase = getFirebaseAdmin();
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer (.+)$/);

    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Please login first."
      });
    }

    await firebase.auth().verifyIdToken(match[1]);
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      error: "Login required or session expired."
    });
  }

  const body = req.body || {};

  if (body.action === "status") {
    return res.status(200).json({
      success: true,
      status: "not_configured",
      videoUrl: null,
      message: "Free video generation is not connected yet."
    });
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please enter a video prompt."
    });
  }

  return res.status(501).json({
    success: false,
    status: "not_configured",
    error: "No video generation provider is connected yet. No paid API was called."
  });
};
      

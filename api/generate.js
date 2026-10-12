const admin = require("firebase-admin");

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      throw new Error("Firebase server credentials are missing.");
    }

    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
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

  // Require a valid Firebase login for every API request.
  let firebase;

  try {
    firebase = getFirebaseAdmin();

    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer (.+)$/);

    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Please login to use this feature."
      });
    }

    await firebase.auth().verifyIdToken(match[1]);
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      error: "Login required or session expired. Please login again."
    });
  }

  const apiKey = process.env.MAGIC_HOUR_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "MAGIC_HOUR_API_KEY is missing in Vercel."
    });
  }

  try {
    const body = req.body || {};

    // Check status of a video job.
    if (body.action === "status") {
      const jobId = body.jobId;

      if (
        typeof jobId !== "string" ||
        !/^[a-zA-Z0-9_-]+$/.test(jobId)
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid video job ID."
        });
      }

      const response = await fetch(
        `https://api.magichour.ai/v1/video-projects/${encodeURIComponent(jobId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json"
          }
        }
      );

      const video = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: video.message || "Could not check video status."
        });
      }

      const videoUrl =
        video.downloads?.length ? video.downloads[0].url : null;

      return res.status(200).json({
        success: true,
        jobId: video.id,
        status: video.status,
        videoUrl,
        error: video.error?.message || null
      });
    }

    // Start video generation.
    const prompt = body.prompt;
    const duration = Number(body.duration || body.end_seconds || 5);

    const requestedRatio =
      body.aspectRatio || body.aspect_ratio || "16:9";

    const aspectRatio = ["16:9", "9:16", "1:1"].includes(requestedRatio)
      ? requestedRatio
      : "16:9";

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a video prompt."
      });
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
      return res.status(400).json({
        success: false,
        error: "Duration must be between 1 and 60 seconds."
      });
    }

    const response = await fetch(
      "https://api.magichour.ai/v1/text-to-video",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name: "AI Video Studio",
          end_seconds: duration,
          aspect_ratio: aspectRatio,
          resolution: "480p",
          model: "ltx-2.5",
          style: {
            prompt: prompt.trim()
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: result.message || "Magic Hour could not start video generation."
      });
    }

    return res.status(200).json({
      success: true,
      jobId: result.id,
      status: "queued",
      message: "Video generation has started."
    });
  } catch (error) {
    console.error("Video API error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error while processing video."
    });
  }
};

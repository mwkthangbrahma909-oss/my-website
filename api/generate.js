module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST request required"
    });
  }

  const apiKey = process.env.MAGIC_HOUR_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "Magic Hour API key is missing in Vercel."
    });
  }

  try {
    const body = req.body || {};

    // Check the status of an existing video job
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

      const statusResponse = await fetch(
        `https://api.magichour.ai/v1/video-projects/${encodeURIComponent(jobId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json"
          }
        }
      );

      const video = await statusResponse.json();

      if (!statusResponse.ok) {
        return res.status(statusResponse.status).json({
          success: false,
          error: video.message || "Could not check video status."
        });
      }

      const videoUrl =
        video.downloads && video.downloads.length
          ? video.downloads[0].url
          : null;

      return res.status(200).json({
        success: true,
        jobId: video.id,
        status: video.status,
        videoUrl,
        error: video.error?.message || null
      });
    }

    // Start a new video generation job
    const prompt = body.prompt;
    const duration = Number(
      body.duration || body.end_seconds || 5
    );

    const requestedRatio =
      body.aspectRatio || body.aspect_ratio || "16:9";

    const aspectRatio = ["16:9", "9:16", "1:1"].includes(
      requestedRatio
    )
      ? requestedRatio
      : "16:9";

    if (
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a video prompt."
      });
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 60
    ) {
      return res.status(400).json({
        success: false,
        error: "Duration must be between 1 and 60 seconds."
      });
    }

    const apiResponse = await fetch(
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

    const result = await apiResponse.json();

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        success: false,
        error:
          result.message ||
          "Magic Hour could not start video generation."
      });
    }

    return res.status(200).json({
      success: true,
      jobId: result.id,
      status: "queued",
      message: "Video generation has started."
    });
  } catch (error) {
    console.error("Magic Hour API error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error while generating video."
    });
  }
};


import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const videos = {
  bunny: {
    title: "Big Buck Bunny",
    url: "/videos/big-buck-bunny.mp4",
    keywords: [
      "rabbit", "bunny", "hare", "khargosh", "खरगोश",
      "forest", "jungle", "cartoon", "खरगोश का कार्टून"
    ]
  },

  dream: {
    title: "Elephants Dream",
    url: "/videos/elephants-dream.mp4",
    keywords: [
      "dream", "elephant", "elephants", "fantasy",
      "magic", "sapna", "हाथी", "जादू"
    ]
  },

  adventure: {
    title: "Sintel",
    url: "/videos/sintel.mp4",
    keywords: [
      "sintel", "dragon", "adventure", "warrior",
      "mountain", "quest", "ड्रैगन", "रोमांच", "साहसिक"
    ]
  },

  fun: {
    title: "Funny Cartoon",
    url: "/videos/funny-cartoon.mp4",
    keywords: [
      "fun", "funny", "comedy", "happy", "party",
      "मजेदार", "हंसी", "खुशी", "कॉमेडी"
    ]
  },

  scifi: {
    title: "Sci-Fi Animation",
    url: "/videos/sci-fi-animation.mp4",
    keywords: [
      "robot", "robots", "sci-fi", "science fiction",
      "space", "future", "technology", "रोबोट",
      "अंतरिक्ष", "भविष्य"
    ]
  }
};

function matchVideo(prompt) {
  const text = prompt.toLowerCase();
  let selected = "bunny";
  let highestScore = 0;

  for (const [key, video] of Object.entries(videos)) {
    let score = 0;

    for (const keyword of video.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.includes(" ") ? 2 : 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      selected = key;
    }
  }

  return {
    key: selected,
    matched: highestScore > 0
  };
}

function getFirebaseAuth() {
  const serviceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin credentials are not configured."
    );
  }

  if (getApps().length === 0) {
    let credentials;

    try {
      credentials = JSON.parse(serviceAccount);
    } catch {
      throw new Error(
        "Firebase service account JSON is invalid."
      );
    }

    initializeApp({
      credential: cert(credentials)
    });
  }

  return getAuth();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const authorization = req.headers.authorization || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return res.status(401).json({
        success: false,
        error: "Please login first."
      });
    }

    const adminAuth = getFirebaseAuth();

    try {
      await adminAuth.verifyIdToken(tokenMatch[1]);
    } catch {
      return res.status(401).json({
        success: false,
        error: "Login expired or invalid. Please login again."
      });
    }

    const body = req.body || {};

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Please enter a video prompt."
      });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({
        success: false,
        error: "Prompt must be 5000 characters or fewer."
      });
    }

    const result = matchVideo(prompt);
    const video = videos[result.key];

    return res.status(200).json({
      success: true,
      videoUrl: video.url,
      title: video.title,
      category: result.key,
      matched: result.matched,

      message: result.matched
        ? `Matched your prompt to ${video.title}.`
        : `No keyword match found. Using ${video.title} as the default sample.`,

      settings: {
        style: body.style || "3D animation",
        language: body.language || "Hindi",
        aspectRatio: body.aspectRatio || "9:16",
        duration: Number(body.duration) || 5,
        music: body.music || "cinematic",
        voiceover: body.voiceover === true
      }
    });
  } catch (error) {
    console.error("Video selection error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Video selection service is not configured correctly."
    });
  }
  }

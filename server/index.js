require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { GoogleGenAI } = require('@google/genai');
const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.log("Firebase Admin initialization failed or serviceAccountKey.json missing.");
}
const db = admin.firestore();

const app = express();

// Security Middleware
// Disable CSP and COOP because they block Firebase Auth iframes and popups
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));

// Basic CORS
app.use(cors());

// Limit JSON payload size to prevent DOS
app.use(express.json({ limit: '10kb' }));

// Trust proxy for Cloud Run so rate-limiter gets the correct IP
app.set('trust proxy', 1);

// Rate Limiting on API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: 'Too many requests, please try again after 15 minutes' }
});

let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Secure Endpoint with Validation & Authentication
app.post('/api/roadmap', 
  authenticateToken,
  apiLimiter,
  [
    body('age').isInt({ min: 10, max: 100 }).withMessage('Age must be a valid number between 10 and 100'),
    body('education').trim().notEmpty().withMessage('Education is required').escape(),
    body('currentWork').trim().notEmpty().withMessage('Current Work is required').escape(),
    body('domain').trim().notEmpty().withMessage('Domain is required').escape(),
    body('interest').trim().isLength({ min: 2, max: 200 }).withMessage('Interest must be between 2 and 200 characters').escape(),
    body('weeks').isInt({ min: 1, max: 52 }).withMessage('Weeks must be a number between 1 and 52')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
    }

    const { age, education, currentWork, domain, interest, weeks } = req.body;

    if (!ai) {
      return res.status(500).json({ error: 'Gemini AI is not configured.' });
    }

    try {
      const prompt = `Design a ${weeks}-week highly personalized learning roadmap for a ${age}-year-old ${currentWork} with a ${education} background in the ${domain} industry who wants to learn ${interest}. Generate exactly one milestone per week (total ${weeks} milestones). Ensure the progression is logical and tailored to their specific background.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING", description: "Title of the week's focus" },
                description: { type: "STRING", description: "Detailed description of what to learn and do" },
                duration: { type: "STRING", description: "The specific week, e.g., 'Week 1'" },
                icon: { type: "STRING", description: "A simple icon name" }
              },
              required: ["title", "description", "duration", "icon"]
            }
          }
        }
      });

      const roadmap = JSON.parse(response.text);
      
      // Save to Firestore securely via Backend
      const docRef = await db.collection('roadmaps').add({
        userId: req.user.uid,
        formData: { age, education, currentWork, domain, interest, weeks },
        roadmap: roadmap,
        createdAt: new Date().toISOString()
      });

      res.json({ roadmap, id: docRef.id });
    } catch (error) {
      console.error("Backend Error:", error);
      res.status(500).json({ error: 'Failed to generate roadmap using AI.' });
    }
});

// Secure History Endpoint
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const historyRef = db.collection('roadmaps');
    const q = historyRef.where('userId', '==', req.user.uid).orderBy('createdAt', 'desc');
    
    let snapshot;
    try {
      snapshot = await q.get();
    } catch(idxError) {
      // Fallback if index missing
      console.log("Fetching history without orderBy due to missing index");
      const qFallback = historyRef.where('userId', '==', req.user.uid);
      snapshot = await qFallback.get();
    }

    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    // Manual sort if fallback
    items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ history: items });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Secure Endpoint to delete a specific roadmap
app.delete('/api/history/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('roadmaps').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Security Layer: Verify ownership!
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this roadmap' });
    }

    await docRef.delete();
    res.json({ success: true, message: 'Roadmap deleted successfully' });
  } catch (error) {
    console.error("Error deleting roadmap:", error);
    res.status(500).json({ error: 'Failed to delete roadmap' });
  }
});

// Secure Endpoint to clear all history
app.delete('/api/history', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const roadmapsRef = db.collection('roadmaps');
    const q = roadmapsRef.where('userId', '==', req.user.uid);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return res.json({ success: true, message: 'History is already empty' });
    }

    // Security Layer: Batch delete only user's own docs
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ success: true, message: 'All history cleared successfully' });
  } catch (error) {
    console.error("Error clearing history:", error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
} else {
  module.exports = app;
}

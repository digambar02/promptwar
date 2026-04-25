require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/roadmap', async (req, res) => {
  const { age, education, currentWork, domain, interest, weeks } = req.body;
  
  if (!age || !education || !interest || !weeks) {
    return res.status(400).json({ error: 'Please provide all required fields including time available in weeks.' });
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
              icon: { type: "STRING", description: "A simple icon name like 'book', 'rocket', 'code', 'users', 'brain', 'star'" }
            },
            required: ["title", "description", "duration", "icon"]
          }
        }
      }
    });

    const roadmap = JSON.parse(response.text);
    res.json({ roadmap });
  } catch (error) {
    console.error("Gemini AI Error:", error);
    res.status(500).json({ error: 'Failed to generate roadmap using AI.' });
  }
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

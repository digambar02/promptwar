const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/roadmap', (req, res) => {
  const { age, education, interest } = req.body;
  
  if (!age || !education || !interest) {
    return res.status(400).json({ error: 'Please provide age, education, and interest.' });
  }

  // Mocked intelligence for generating roadmaps
  const roadmap = generateRoadmap(age, education, interest);
  
  setTimeout(() => {
    res.json({ roadmap });
  }, 1500); // Simulate API call delay for dynamic feel
});

function generateRoadmap(age, education, interest) {
  return [
    {
      title: `Introduction to ${interest}`,
      description: `Begin your journey into ${interest}. Start with the foundational concepts tailored for someone with a ${education} background.`,
      duration: "Week 1-2",
      icon: "rocket"
    },
    {
      title: `Core Principles of ${interest}`,
      description: `Dive deeper into the mechanics and theory. At ${age} years old, practical hands-on exercises will solidify your understanding faster.`,
      duration: "Week 3-6",
      icon: "book"
    },
    {
      title: "Practical Application & Projects",
      description: `Apply what you've learned to build a small real-world project related to ${interest}. This is crucial for portfolio building.`,
      duration: "Week 7-10",
      icon: "code"
    },
    {
      title: "Advanced Topics & Networking",
      description: `Choose a niche within ${interest} to specialize in. Connect with peers at your ${education} level to collaborate.`,
      duration: "Week 11-14",
      icon: "users"
    }
  ];
}

const path = require('path');

app.use(express.static(path.join(__dirname, '../client/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

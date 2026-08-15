import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy instantiate GoogleGenAI client
  const getGenAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'IndiGoal' });
  });

  // AI Tactical Coach Feedback
  app.post('/api/ai/coach-analysis', async (req, res) => {
    try {
      const { playerProfile, recentDrills, prompt } = req.body;
      const ai = getGenAIClient();

      const sysInstruction = `You are Coach S. Mukherjee, Lead Tactical Trainer at IndiGoal National Football Academy. 
Your tone is professional, encouraging, analytical, and highly tactical. Speak directly to the athlete (e.g. Arjun).
Provide a short 2-3 sentence tactical breakdown focusing on their pass accuracy, scan rate, transition speed, and next milestone.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Player Profile: ${JSON.stringify(playerProfile || {})}
Recent Drills: ${JSON.stringify(recentDrills || [])}
User Question/Prompt: ${prompt || 'Analyze my recent performance and give me tactical guidance.'}`,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.7,
        },
      });

      res.json({ feedback: response.text });
    } catch (error: any) {
      console.error('Error generating coach feedback:', error);
      res.status(500).json({
        error: error?.message || 'Failed to generate coach feedback',
        fallbackFeedback: '"Arjun, your scan rate has increased by 12% this week. Focus on your weight of pass during the transition phase. Excellent intensity on the sprints."',
      });
    }
  });

  // AI Community Talent Scout Evaluation
  app.post('/api/ai/scout-report', async (req, res) => {
    try {
      const { playerName, ageCategory, position, topSpeed, passAccuracy, notes } = req.body;
      const ai = getGenAIClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Evaluate a young football talent for the IndiGoal National Scout Database aimed at Mission FIFA World Cup 2034:
Player Name: ${playerName}
Age Category: ${ageCategory}
Position: ${position}
Top Speed: ${topSpeed || '30.5'} km/h
Pass Accuracy: ${passAccuracy || '85'}%
Scout Notes: ${notes}`,
        config: {
          systemInstruction: 'You are the Chief Technical Scout for the All India Football Federation (AIFF) IndiGoal Grassroots Program. Analyze talent submissions and return structured JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              potentialScore: { type: Type.NUMBER, description: 'Rating out of 100 for World Cup 2034 potential' },
              scoutTier: { type: Type.STRING, description: 'Tier name like "Tier 1 - National Prospect", "Tier 2 - Regional Elite"' },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedDrill: { type: Type.STRING, description: 'Best drill recommendation' },
              executiveSummary: { type: Type.STRING, description: 'Concise 2-sentence scouting summary' }
            },
            required: ['potentialScore', 'scoutTier', 'strengths', 'areasToImprove', 'recommendedDrill', 'executiveSummary']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error('Error generating scout report:', error);
      res.status(500).json({
        error: error?.message || 'Failed to evaluate scout report',
        potentialScore: 88,
        scoutTier: 'Tier 1 - National Prospect',
        strengths: ['High recovery speed', 'Tactical spatial awareness'],
        areasToImprove: ['Left-foot shot power', 'Aerial timing under pressure'],
        recommendedDrill: 'Precision Passing & Transition Speed Drills',
        executiveSummary: 'Demonstrates exceptional vision and passing range suitable for the U-23 national talent pool.'
      });
    }
  });

  // AI Drill Tactical Assistant
  app.post('/api/ai/drill-assistant', async (req, res) => {
    try {
      const { drillTitle, question } = req.body;
      const ai = getGenAIClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Drill: "${drillTitle}". Player Question: "${question}"`,
        config: {
          systemInstruction: 'You are the IndiGoal AI Tactical Assistant. Provide 2 concise, clear bullet points explaining bodily movement, body angle, or pitch spatial tips to execute this drill with max efficiency.',
        }
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error('Error in drill assistant:', error);
      res.status(500).json({
        error: error?.message || 'Failed to query drill assistant',
        answer: 'Keep your body weight centered over your supporting foot, and keep your ankle firm upon ball impact to maintain trajectory precision.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IndiGoal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

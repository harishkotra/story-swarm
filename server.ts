import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { provider, model, systemPrompt, messages, temperature, stream: isStreamRequested } = req.body;
      const isStream = isStreamRequested !== false; // Default to true
      
      if (isStream) {
        // Setup response for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
      }

      if (provider === "gemini") {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is missing");
        }
        
        const ai = new GoogleGenAI({ 
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'story-swarm-build' } }
        });

        const prompt = messages.map((m: any) => `${m.role === 'user' ? 'System/Director/Context' : 'Another Agent'}: ${m.content}`).join("\n");
        const contents = `${prompt}\n\nContinue the story with exactly one short sentence or phrase, never explaining yourself.`;

        const responseStream = await ai.models.generateContentStream({
            model: model || "gemini-3.1-flash-lite",
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                temperature: temperature ?? 1.0
            }
        });

        let fullText = "";
        for await (const chunk of responseStream) {
            const textChunk = chunk.text;
            if (textChunk) {
                fullText += textChunk;
                if (isStream) {
                  res.write(`data: ${JSON.stringify({ type: 'chunk', content: textChunk })}\n\n`);
                }
            }
        }
        
        if (isStream) {
          res.write(`data: ${JSON.stringify({ type: 'done', content: fullText })}\n\n`);
        } else {
          res.json({ content: fullText });
        }

      } else {
        // Handle OpenAI, OpenRouter / Featherless, LM Studio, etc.
        let apiKey = "";
        let baseURL = undefined;

        if (provider === "openai") {
             apiKey = process.env.OPENAI_API_KEY || "dummy"; 
             baseURL = undefined;
        } else if (provider === "featherless") {
             apiKey = process.env.FEATHERLESS_API_KEY || "dummy";
             baseURL = process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1";
        } else if (provider === "lmstudio") {
             apiKey = "not-needed";
             baseURL = process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1";
        } else if (provider === "ollama") {
             apiKey = "ollama";
             baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
        } else {
             throw new Error(`Unsupported provider: ${provider}`);
        }

        const openai = new OpenAI({
            apiKey,
            baseURL
        });

        const oaiMessages = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        const stream = await openai.chat.completions.create({
            model: model || "gpt-4o-mini",
            messages: oaiMessages,
            temperature: temperature ?? 1.0,
            stream: true,
        });

        let fullText = "";
        for await (const chunk of stream) {
            const textChunk = chunk.choices[0]?.delta?.content || "";
            if (textChunk) {
                 fullText += textChunk;
                 if (isStream) {
                   res.write(`data: ${JSON.stringify({ type: 'chunk', content: textChunk })}\n\n`);
                 }
            }
        }

        if (isStream) {
          res.write(`data: ${JSON.stringify({ type: 'done', content: fullText })}\n\n`);
        } else {
          res.json({ content: fullText });
        }
      }

      if (isStream) res.end();
    } catch (err: any) {
      console.error(err);
      if (res.headersSent && res.getHeader('Content-Type') === 'text/event-stream') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Unknown error' })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: err.message || 'Unknown error' });
      }
    }
  });

  app.post("/api/generate-poster", async (req, res) => {
    try {
      const { title, synopsis, genre, characters } = req.body;
      const prompt = `A cinematic movie poster for a film titled "${title}". Genre: ${genre}. Synopsis: ${synopsis}. Key elements or characters: ${characters?.join(", ")}. High quality, highly detailed, dramatic lighting, movie poster aesthetic.`;

      // Use Pollinations AI for free, fast image generation without API keys
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&nologo=true`;

      res.json({ imageUrl });
    } catch (err: any) {
      console.error("Poster generation error:", err);
      res.status(500).json({ error: err.message || 'Unknown error' });
    }
  });

  app.post("/api/generate-scene", async (req, res) => {
    try {
      const { description, genre } = req.body;
      const prompt = `A cinematic storyboard scene. Genre: ${genre}. Scene description: ${description}. Concept art, highly detailed, atmospheric lighting, wide angle shot.`;

      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

      res.json({ imageUrl });
    } catch (err: any) {
      console.error("Scene generation error:", err);
      res.status(500).json({ error: err.message || 'Unknown error' });
    }
  });

  app.post("/api/detect-genre", async (req, res) => {
    try {
      const { storyText } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing");
      }
      const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'story-swarm-build' } }
      });
      const prompt = `Analyze the following story snippet. 
Return a JSON object with:
1. "genre": a 2-3 word genre name.
2. "tension": a number from 0 to 100 representing the narrative tension.

Output ONLY raw JSON.

Story:
${storyText}`;

      const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
              responseMimeType: "application/json"
          }
      });

      try {
          const data = JSON.parse(response.text?.trim() || "{}");
          res.json({ genre: data.genre || "UNKNOWN", tension: data.tension || 50 });
      } catch(e) {
          res.json({ genre: "UNKNOWN", tension: 50 });
      }
    } catch (err: any) {
      console.error("Genre detection error:", err);
      res.status(500).json({ error: err.message || 'Unknown error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

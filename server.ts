import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Configuration
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Multer for image uploads (in-memory)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // API Routes
  app.post("/api/analyze", (req, res, next) => {
    upload.single('image')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      if (!genAI) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const { prompt } = req.body;
      const file = (req as any).file;

      if (!file && !prompt) {
        return res.status(400).json({ error: "No evidence provided" });
      }

      const model = (genAI as any).getGenerativeModel({ 
        model: "gemini-1.5-pro",
        // System instruction ensures the model sticks to the forensic framework
        systemInstruction: "You are an elite OSINT investigator. NEVER hallucinate. Analyze evidence with extreme precision. Distinguish between direct observations and inferences. Use a professional, forensic tone.",
      });

      const parts: any[] = [];
      if (prompt) parts.push(prompt);
      if (file) {
        parts.push({
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype
          }
        });
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.1, // Near-zero temperature for deterministic, factual responses
          topP: 0.8,
          topK: 10,
          maxOutputTokens: 2048,
        }
      });
      
      const response = result.response;
      const text = response.text();

      res.json({ analysis: text });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze evidence" });
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

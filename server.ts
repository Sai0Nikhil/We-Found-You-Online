import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

interface MulterRequest extends Request {
  file: Express.Multer.File;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Configuration
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Multer for image uploads (in-memory)
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post("/api/analyze", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!genAI) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const { prompt } = req.body;
      const file = (req as any).file;

      if (!file && !prompt) {
        return res.status(400).json({ error: "No evidence provided" });
      }

      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
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

      const result = await model.generateContent(parts);
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

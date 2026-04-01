import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "data.json");

async function readData() {
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

async function writeData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/check-code", async (req, res) => {
    const { code } = req.body;
    console.log(`Checking code: ${code}`);
    const data = await readData();
    res.json({ exists: !!data[code] });
  });

  app.post("/api/save-data", async (req, res) => {
    const { code, payload } = req.body;
    if (!code) return res.status(400).json({ error: "Code required" });
    
    console.log(`Saving data for code: ${code}, payload size: ${JSON.stringify(req.body).length} bytes`);
    
    try {
      const data = await readData();
      data[code] = payload;
      
      // Atomic write: write to temp file then rename
      const tempFile = `${DATA_FILE}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
      await fs.rename(tempFile, DATA_FILE);
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error saving data for ${code}:`, error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/load-data", async (req, res) => {
    const { code } = req.body;
    console.log(`Loading data for code: ${code}`);
    
    try {
      const data = await readData();
      if (data[code]) {
        console.log(`Data found for code: ${code}`);
        res.json({ success: true, data: data[code] });
      } else {
        console.log(`Code not found: ${code}`);
        res.json({ success: false, error: "Code not found" });
      }
    } catch (error) {
      console.error(`Error loading data for ${code}:`, error);
      res.status(500).json({ success: false, error: "Internal server error" });
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

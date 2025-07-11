import "dotenv/config";
import express from "express";
import http from "http";

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// Basic middleware
app.use(express.json());

// Simple health check
app.get("/", (req, res) => {
  res.status(200).send("Server is running!");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Create and start server
const server = http.createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Minimal server is running on port ${port}`);
  if (process.send) {
    process.send('ready');
  }
});

server.on('error', (error: any) => {
  console.error('Server error:', error);
  process.exit(1);
});
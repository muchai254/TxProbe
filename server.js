import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './server/routes.js';

// Local development reads the key from .env; hosted deploys set it directly.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}
if (!process.env.BLOCKCHAIR_API_KEY) {
  console.error('BLOCKCHAIR_API_KEY is not set. Add it to .env or the environment.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(routes);

// Serve built frontend in production
app.use(express.static(path.join(__dirname, 'web', 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`txprobe server running on http://localhost:${PORT}`);
});

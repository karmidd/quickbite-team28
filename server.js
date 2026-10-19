// Starts the QuickBite server. Usage: npm start (or npm run dev to restart on changes)
import { app } from './src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`QuickBite running at http://localhost:${PORT}`);
});

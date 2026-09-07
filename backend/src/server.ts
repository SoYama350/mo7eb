import 'dotenv/config';
import app from './app';
import { startJobs } from './jobs/expiry';

const PORT = parseInt(process.env.PORT || '12001', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Telecom API running on http://0.0.0.0:${PORT}`);
  startJobs();
});
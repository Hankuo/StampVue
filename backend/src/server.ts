import { createApp } from './app.js';

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`🚀 StampVue Backend Service is running on http://localhost:${port}`);
  console.log(`👉 Health check: http://localhost:${port}/api/stamp/health`);
});

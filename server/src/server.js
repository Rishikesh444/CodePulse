import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { defaultSimulationEngine } from './simulation/trafficGenerator.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('[Server] Initializing CodePulse-Lite Server...');
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[Server] CodePulse-Lite listening on http://localhost:${PORT}`);
      console.log(`[Server] REST API endpoints available at http://localhost:${PORT}/api`);
      
      // Auto-start simulation engine on startup
      defaultSimulationEngine.start();
    });

    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Stopping traffic simulation and shutting down...`);
      defaultSimulationEngine.pause();
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Database disconnected. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('[Server] Fatal error during startup:', err);
    process.exit(1);
  }
}

startServer();

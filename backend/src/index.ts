import app from './app';
import { config } from './config';
import prisma from './config/database';
import { connectRedis } from './config/redis';

async function main() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to PostgreSQL database');

    // Connect to Redis
    await connectRedis();
    console.log('Connected to Redis');

    // Start server
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();

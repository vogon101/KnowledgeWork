import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
// Load environment variables from packages/server/.env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });
import { getPrisma, closePrisma } from './prisma.js';
import { initSocketServer } from './events.js';
// tRPC router
import { appRouter, createContext } from './trpc/index.js';
const app = express();
const httpServer = createServer(app);
const PORT = process.env.TASK_SERVICE_PORT || 3004;
// Socket.io for real-time updates
const io = new SocketServer(httpServer, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
    },
});
initSocketServer(io);
// Middleware
app.use(cors());
app.use(express.json());
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'task-service', trpc: true });
});
// tRPC API - type-safe endpoints (primary API)
app.use('/api/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path, input }) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`tRPC Error on "${path}"`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        if (input !== undefined) {
            console.error('Input:', JSON.stringify(input, null, 2));
        }
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
        console.error('Stack:', error.stack);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },
}));
// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Not found: ${req.method} ${req.path}`
    });
});
// Initialize Prisma and start server
getPrisma(); // Prisma client for unified item model
const server = httpServer.listen(PORT, () => {
    console.log(`Task service running on http://localhost:${PORT}`);
    console.log(`Socket.io ready for real-time updates`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close(async () => {
        await closePrisma();
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    server.close(async () => {
        await closePrisma();
        process.exit(0);
    });
});

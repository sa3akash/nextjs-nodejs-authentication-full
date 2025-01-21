import { Application } from 'express';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import hpp from 'hpp';
import http from 'http';
import os from 'os';
import cookieParser from 'cookie-parser';

import { config } from '@root/config';
import mainRoute from '@root/routes';
import { globalErrorHandler, ServerError } from 'error-express';

export class SetupServer {
  private readonly app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.globalErrorHandler(this.app);
    this.startServer(this.app);
  }

  private securityMiddleware(app: Application): void {
    app.set('trust proxy', 1);
    app.use(
      cors({
        origin: (requestOrigin, callback) => {
          const allowedOrigins = [config.CLIENT_URL!];
          if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
            throw new ServerError('Request block by cors', 400);
          }
          callback(null, allowedOrigins); // allowedOrigin or true
        },
        credentials: true,
        optionsSuccessStatus: 204,
        maxAge: 6000,
        preflightContinue: false
      })
    );
    app.use(helmet());
    app.use(hpp());
    app.use(cookieParser());
  }

  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(express.json({ limit: '100MB' }));
    app.use(express.urlencoded({ extended: true, limit: '500MB' }));
  }

  private routesMiddleware(app: Application): void {
    mainRoute(app);
  }

  private globalErrorHandler(app: Application): void {
    app.get('/', (req, res) => {
      res.json({ message: 'All Ok!', os: os.hostname() });
    });
    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Routes not found!' });
    });
    app.use(globalErrorHandler);
  }
  private startServer(app: Application): void {
    const httpServer = http.createServer(app);
    httpServer.listen(config.PORT, () => {
      console.log(`STARTING SERVER ON PORT ${config.PORT} PROCESS ID =${process.pid}`);
    });
  }
}

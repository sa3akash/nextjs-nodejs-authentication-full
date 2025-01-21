import express from 'express';
import { SetupServer } from '@root/app';
import { config } from '@root/config';
import { dbConnect } from '@root/dbConnect';

class MainServer {
  public initialize() {
    const app = express();
    const setupServer: SetupServer = new SetupServer(app);
    config.validateConfig();
    dbConnect();
    setupServer.start();
  }
}

const mainServer = new MainServer();
mainServer.initialize();

process.on('uncaughtException', (err: Error) => {
  console.log(`There was an uncaught error: ${err}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.log(`Unhandled rejection at: ${reason}`);
  process.exit(1);
});

// ========================== cluster management ============

// import cluster from 'cluster';
// import os from 'os';

// class MainServer {
//   private setupServer: SetupServer;
//
//   constructor() {
//     const app = express();
//     this.setupServer = new SetupServer(app);
//   }
//
//   public initialize() {
//     config.validateConfig();
//     dbConnect();
//     this.setupServer.start();
//   }
//
//   public startCluster() {
//     if (cluster.isPrimary) {
//       console.log(`Primary ${process.pid} is running`);
//
//       // Fork workers.
//       const numCPUs = os.cpus().length;
//       for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//       }
//
//       cluster.on('exit', (worker, code, signal) => {
//         console.log(`worker ${worker.process.pid} died`);
//         cluster.fork(); // Restart the worker
//       });
//     } else {
//       // Worker process
//       console.log(`Worker ${process.pid} started`);
//       this.initialize(); // Initialize the server in each worker
//     }
//   }
// }
//
// const mainServer = new MainServer();
// mainServer.startCluster();

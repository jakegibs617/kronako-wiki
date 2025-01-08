// ENTRY POINT FOR FIREBASE FUNCTIONS
import 'reflect-metadata';
import 'source-map-support/register';
import * as functions from 'firebase-functions';
import cors from 'cors';
import express, { RequestHandler } from 'express';
import { productionStartup } from './common/startup';
import { Component } from './common/ioc/components';
import { Config } from '../shared/model/config';
import { APIEndpointFactory } from './api/endpoints';

// Initialize the IoC container and components
const container = productionStartup();
const apiEndpointFactory = container.get<APIEndpointFactory>(Component.APIEndpointFactory);
const config = container.get<Config>(Component.config);

// Create an Express app and apply middleware
const app = express();

// Define CORS options
const corsOptions = {
  origin: 'https://kronako-wiki.web.app', // Replace with your allowed origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Authorization, Content-Type, X-Requested-With, Accept',
  optionsSuccessStatus: 204,
};


// Apply CORS middleware with explicit type casting
const corsMiddleware = cors(corsOptions) as RequestHandler;
app.use(corsMiddleware);
app.options('*', corsMiddleware);

// Attach the API endpoints to the Express app
app.use('/api', apiEndpointFactory.createAPI());

// Add a logging middleware for debugging
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`[${req.method}] ${req.url}`);
  console.log(`Headers:`, req.headers);
  next();
});

// Export the Firebase Function
export const wiki = functions
  .region(config.deploy.apiRegion)
  .runWith({
    timeoutSeconds: 540,
  })
  .https.onRequest(app);

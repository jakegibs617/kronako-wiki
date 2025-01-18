// ENTRY POINT FOR FIREBASE FUNCTIONS
import 'reflect-metadata';
import 'source-map-support/register';
import * as functions from 'firebase-functions';
import cors from 'cors';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { productionStartup } from './common/startup';
import { Component } from './common/ioc/components';
import { Config } from '../shared/model/config';
import { APIEndpointFactory } from './api/endpoints';
import allowedIPsData from './allowed-ips.json';

// Initialize the IoC container and components
const container = productionStartup();
const apiEndpointFactory = container.get<APIEndpointFactory>(Component.APIEndpointFactory);

const config = container.get<Config>(Component.config);

// Create an Express app and apply middleware
const app = express();

// Define CORS options
const corsOptions = {
  origin: 'https://kronako-wiki.web.app', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Authorization, Content-Type, X-Requested-With, Accept',
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
const corsMiddleware = cors(corsOptions) as RequestHandler;
app.use(corsMiddleware);
app.options('*', corsMiddleware);

// unfortunately the ipv6 will change too often to keep up, but assuming we use a vpn or a static ip, we can use this later
const allowedIPs = (allowedIPsData.allowed_ips || []).filter((ip: string) => {
  const isValidIPv4 = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.([0-9]{1,3}\.){2}[0-9]{1,3}$/.test(ip);
  const isValidIPv6 = /^([a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/.test(ip);
  return isValidIPv4 || isValidIPv6;
});

// Normalize IP address (take the first IP from x-forwarded-for if there’s a chain)
const normalizeIP = (ip: string | undefined): string =>
  ip?.split(',')[0].trim() || '';

// Middleware for IP restriction
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestIP = normalizeIP(req.headers['x-forwarded-for'] as string)
    || req.socket.remoteAddress
    || '';

  console.log(`[${new Date().toISOString()}] [${req.method}] ${req.url}`);
  console.log(`Request from IP: ${requestIP}`);
  // console.log(`allowedIPs from IP: ${allowedIPs}`);

  // if (allowedIPs.includes(requestIP)) {
    next(); // Allow the request to proceed
  // } else {
    // console.warn(`Access denied for IP: ${requestIP}`);
    // res.status(403).send('Access Denied: Your IP is not on the allowlist.');
  // }
});

// Attach the API endpoints to the Express app
app.use('/api', apiEndpointFactory.createAPI());

// Export the Firebase Function for the API
export const wiki = functions
  .region(config.deploy.apiRegion)
  .runWith({
    timeoutSeconds: 540,
  })
  .https.onRequest(app);

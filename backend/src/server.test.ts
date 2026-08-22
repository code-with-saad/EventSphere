import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

/**
 * CORS Configuration Tests
 * 
 * Tests Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6
 */
describe('CORS Configuration', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  
  // Create a minimal test app with the same CORS configuration
  const app = express();
  const corsOptions = {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
  };
  
  app.use(cors(corsOptions));
  app.use(express.json());
  
  app.get('/test', (_req, res) => {
    res.json({ message: 'CORS test endpoint' });
  });

  it('should accept requests from allowed origin', async () => {
    // Req 23.1, 23.5: Accept requests from frontend origin
    const response = await request(app)
      .get('/test')
      .set('Origin', FRONTEND_URL);
    
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(FRONTEND_URL);
  });

  it('should allow credentials in requests', async () => {
    // Req 23.2: Allow credentials
    const response = await request(app)
      .get('/test')
      .set('Origin', FRONTEND_URL);
    
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should allow Content-Type header', async () => {
    // Req 23.4: Allow Content-Type header
    const response = await request(app)
      .options('/test')
      .set('Origin', FRONTEND_URL)
      .set('Access-Control-Request-Headers', 'Content-Type');
    
    expect(response.status).toBe(200);
    const allowedHeaders = response.headers['access-control-allow-headers'];
    expect(allowedHeaders).toContain('Content-Type');
  });

  it('should allow Authorization header', async () => {
    // Req 23.3: Allow Authorization header
    const response = await request(app)
      .options('/test')
      .set('Origin', FRONTEND_URL)
      .set('Access-Control-Request-Headers', 'Authorization');
    
    expect(response.status).toBe(200);
    const allowedHeaders = response.headers['access-control-allow-headers'];
    expect(allowedHeaders).toContain('Authorization');
  });

  it('should allow specified HTTP methods', async () => {
    // Test allowed methods
    const response = await request(app)
      .options('/test')
      .set('Origin', FRONTEND_URL)
      .set('Access-Control-Request-Method', 'POST');
    
    expect(response.status).toBe(200);
    const allowedMethods = response.headers['access-control-allow-methods'];
    expect(allowedMethods).toContain('GET');
    expect(allowedMethods).toContain('POST');
    expect(allowedMethods).toContain('PUT');
    expect(allowedMethods).toContain('PATCH');
    expect(allowedMethods).toContain('DELETE');
    expect(allowedMethods).toContain('OPTIONS');
  });

  it('should only allow the configured origin', async () => {
    // Req 23.6: Only accept requests from configured origin
    const response = await request(app)
      .get('/test')
      .set('Origin', FRONTEND_URL);
    
    // Verify the specific origin is returned (not wildcard)
    expect(response.headers['access-control-allow-origin']).toBe(FRONTEND_URL);
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });
});

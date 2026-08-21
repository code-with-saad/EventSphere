import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment Variable Schema
 * 
 * Validates all required environment variables using Zod.
 * This ensures type safety and prevents runtime errors from missing or invalid configuration.
 */
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().regex(/^\d+$/).transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Database Configuration
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),

  // Email Service Configuration (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // SuperAdmin Seed Configuration
  SUPERADMIN_EMAIL: z.string().email('SUPERADMIN_EMAIL must be a valid email address'),
  SUPERADMIN_PASSWORD: z.string().min(8, 'SUPERADMIN_PASSWORD must be at least 8 characters long'),

  // CORS Configuration
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
});

/**
 * Validated Environment Variables
 * 
 * Parses and validates environment variables according to the schema.
 * Throws an error if validation fails, preventing the application from starting with invalid config.
 */
export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;

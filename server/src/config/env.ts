import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/career_pathfinder',
  
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'fallback_jwt_access_secret_key_32chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_jwt_refresh_secret_key_32chars',
  
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_SERVICE_TIMEOUT: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
  AI_MOCK_MODE: process.env.AI_MOCK_MODE === 'true',
  
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
};

export function validateProductionEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MONGODB_URI) {
      errors.push('MONGODB_URI environment variable is required in production.');
    }
    if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.startsWith('fallback_')) {
      errors.push('Secure JWT_ACCESS_SECRET environment variable is required in production.');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.startsWith('fallback_')) {
      errors.push('Secure JWT_REFRESH_SECRET environment variable is required in production.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

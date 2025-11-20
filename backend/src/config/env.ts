import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  openrouterApiKey: process.env.OPENROUTER_API_KEY!,
  drinApiKey: process.env.DRIN_API_KEY!,
  openrouterModel: process.env.OPENROUTER_MODEL || 'openai/chatgpt-4o-latest',
};

// Validação
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENROUTER_API_KEY',
  'DRIN_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is required`);
  }
}


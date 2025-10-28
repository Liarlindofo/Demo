import { StackServerApp } from '@stackframe/stack';

// Detectar ambiente e base URL
const isDevelopment = process.env.NODE_ENV === 'development';
const isDevBypass = process.env.DEV_AUTH_BYPASS === 'true';

// URL base dinâmica baseada no ambiente
const getBaseUrl = () => {
  if (isDevBypass || (isDevelopment && process.env.VERCEL !== '1')) {
    // Localhost para desenvolvimento
    return 'http://localhost:3000';
  }
  // Produção
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://platefull.com.br';
};

const baseUrl = getBaseUrl();

export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || 'internal',
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY,
  urls: {
    signIn: `${baseUrl}/auth/login`,
    signUp: `${baseUrl}/auth/register`,
    afterSignIn: `${baseUrl}/dashboard`,
    afterSignUp: `${baseUrl}/dashboard`,
    afterSignOut: `${baseUrl}/`,
    handler: `${baseUrl}/handler`,
  },
});

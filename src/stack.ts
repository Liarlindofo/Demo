import { StackServerApp } from '@stackframe/stack';

// URL base dinâmica baseada no ambiente
const getBaseUrl = () => {
  // Verificar se estamos em desenvolvimento local
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    return 'http://localhost:3000';
  }
  
  // Produção ou Vercel
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://platefull.com.br';
};

const baseUrl = getBaseUrl();

export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  urls: {
    signIn: `${baseUrl}/auth/login`,
    signUp: `${baseUrl}/auth/register`,
    afterSignIn: `${baseUrl}/dashboard`,
    afterSignUp: `${baseUrl}/dashboard`,
    afterSignOut: `${baseUrl}/`,
    handler: `${baseUrl}/api/handler`,
  },
});

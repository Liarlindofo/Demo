import { StackServerApp } from '@stackframe/stack';

export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || 'internal',
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY,
  urls: {
    signIn: 'https://platefull.com.br/auth/login',
    signUp: 'https://platefull.com.br/auth/register',
    afterSignIn: 'https://platefull.com.br/dashboard',
    afterSignUp: 'https://platefull.com.br/auth/verify-otp',
    afterSignOut: 'https://platefull.com.br/',
    handler: 'https://platefull.com.br/handler',
  },
});

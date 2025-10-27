import { StackServerApp } from '@stackframe/stack';

export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    signIn: 'https://platefull.com.br/auth/login',
    signUp: 'https://platefull.com.br/auth/register',
    afterSignIn: 'https://platefull.com.br/dashboard',
    afterSignUp: 'https://platefull.com.br/auth/verify-otp',
    afterSignOut: 'https://platefull.com.br/',
    handler: 'https://platefull.com.br/handler',
  },
});

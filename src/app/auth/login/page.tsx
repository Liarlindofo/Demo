'use client';

import { SignIn } from '@stackframe/stack';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <SignIn />
    </div>
  );
}
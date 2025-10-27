import { StackHandler } from '@stackframe/stack';
import type { JSX } from 'react';

export default function Handler(props: Record<string, unknown>): JSX.Element {
  return <StackHandler fullPage {...props} />;
}
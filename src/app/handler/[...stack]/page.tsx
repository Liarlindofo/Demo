import { StackHandler } from '@stackframe/stack';

export default function Handler(props: React.ComponentProps<typeof StackHandler>) {
  return <StackHandler fullPage {...props} />;
}
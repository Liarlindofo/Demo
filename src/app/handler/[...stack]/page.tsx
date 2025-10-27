import { StackHandler } from '@stackframe/stack';

export default function Handler(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <StackHandler fullPage {...props} />;
}
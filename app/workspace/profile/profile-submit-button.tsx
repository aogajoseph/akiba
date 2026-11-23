"use client";

import { useFormStatus } from "react-dom";

type Props = {
  idle: string;
  pending: string;
  className?: string;
};

export function ProfileSubmitButton({ idle, pending, className = "workspace-primary" }: Props) {
  const { pending: isPending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={isPending} aria-busy={isPending}>
      {isPending ? pending : idle}
    </button>
  );
}

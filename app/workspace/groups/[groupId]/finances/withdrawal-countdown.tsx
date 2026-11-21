"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { processDueWithdrawalStaging } from "@/app/workspace/actions";

type Props = {
  groupId: string;
  requestId: string;
  deadline: string;
};

function remainingMilliseconds(deadline: string) {
  const timestamp = Date.parse(deadline);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function WithdrawalCountdown({ groupId, requestId, deadline }: Props) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(() => remainingMilliseconds(deadline));
  const processing = useRef(false);

  useEffect(() => {
    let mounted = true;

    const tick = () => {
      const next = remainingMilliseconds(deadline);
      if (mounted) setRemaining(next);

      if (next === 0 && !processing.current) {
        processing.current = true;
        void processDueWithdrawalStaging(groupId, requestId)
          .then((processed) => {
            if (mounted) {
              router.refresh();
              if (!processed) processing.current = false;
            }
          })
          .catch(() => {
            if (mounted) processing.current = false;
          });
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [deadline, groupId, requestId, router]);

  const closed = remaining === 0;

  return (
    <div className="ak-withdrawal-countdown" role="group" aria-label="Withdrawal member review countdown">
      <span>{closed ? "Review closed" : "Review closes in"}</span>
      <strong aria-live="off" aria-atomic="true">{formatCountdown(remaining)}</strong>
      {closed && <small>Finalizing the review outcome…</small>}
    </div>
  );
}

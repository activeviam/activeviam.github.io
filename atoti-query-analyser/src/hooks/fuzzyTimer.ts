import { useEffect, useState } from "react";

export interface FuzzyTimer {
  exactDuration: number;
}

function calculateFuzzyTimer(initialTimestamp: number): FuzzyTimer {
  const currentTimestamp = Date.now();
  const exactDuration = currentTimestamp - initialTimestamp;
  return { exactDuration };
}

export function useFuzzyTimer(initialTimestamp: number) {
  const [timer, setTimer] = useState(calculateFuzzyTimer(initialTimestamp));
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(calculateFuzzyTimer(initialTimestamp));
    }, 5000);
    return () => clearInterval(interval);
  }, [initialTimestamp]);
  return timer;
}

export function parseFuzzyTimer({ exactDuration }: FuzzyTimer): string {
  const seconds = exactDuration / 1000;
  if (seconds < 0) {
    return "somewhere in future...";
  }
  if (seconds < 5) {
    return "now";
  }
  if (seconds < 60) {
    return `${Math.floor(seconds)} seconds ago`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Math.floor(minutes)} minute${minutes < 2 ? "" : "s"} ago`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return `${Math.floor(hours)} hour${hours < 2 ? "" : "s"} ago`;
  }
  const days = hours / 24;
  return `${Math.floor(days)} day${days < 2 ? "" : "s"} ago`;
}

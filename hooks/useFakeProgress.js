import { useEffect, useRef, useState } from "react";

export function useFakeProgress (isRunning) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    let value = 0;

    timerRef.current = setInterval(() => {
      value += Math.random();

      setProgress(Math.min(value, 95));
    }, 400);

    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const complete = () => {
    clearInterval(timerRef.current);
    setProgress(100);
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setProgress(0);
  };

  return { progress, complete, reset };
}
import React, { useEffect, useRef } from "react";

export function useDebounce(fn, delay, abortControllerRef) {
  const timer = useRef();
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  return function (...args) {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    timer.current = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

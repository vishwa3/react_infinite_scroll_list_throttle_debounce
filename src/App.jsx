import React, { useState, useEffect, useRef } from "react";
//import { useDebounce } from "./useDebounce";
import "./App.css";

export default function App() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);
  console.log(
    data.length,
    pageRef.current,
    isLoading,
    abortControllerRef.current
  );

  async function fetchItems(signal) {
    return await new Promise(function (resolve, reject) {
      const timeoutId = setTimeout(() => {
        const data = Array.from(
          { length: 50 },
          (_, i) => `Item ${pageRef.current * 50 + i + 1}`
        );
        resolve(data);
      }, 2000);
      signal?.addEventListener("abort", () => {
        loadingRef.current = false;
        setIsLoading(false);
        abortControllerRef.current = null;
        clearTimeout(timeoutId);
        console.log("aborted");
        reject(new Error("Fetch aborted"));
      });
    });
  }

  // function debounce(fn, delay) {
  //   let timer;
  //   const debouncedFn = function (...args) {
  //     const context = this;
  //     clearTimeout(timer);
  //     if (abortControllerRef.current) {
  //       abortControllerRef.current.abort();
  //     }
  //     timer = setTimeout(() => {
  //       //  fn(...args)
  //       fn.apply(context, args);
  //     }, delay);
  //   };

  //   debouncedFn.cleanup = () => {
  //     clearTimeout(timer);
  //   };

  //   return debouncedFn;
  // }

  function throttle(fn, delay, { leading = true, trailing = true } = {}) {
    let lastTime = 0;
    let timerId = null;
    let latestArg, latestThis;

    function invoke() {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fn.apply(latestThis, latestArg);
      lastTime = Date.now();
      latestArg = latestThis = null;
    }

    function throttled(...args) {
      const now = Date.now();
      latestArg = args;
      latestThis = this;

      if (lastTime === 0 && leading === false) {
        lastTime = now;
      }

      const remaining = delay - (now - lastTime);

      if (remaining <= 0) {
        invoke();
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
      } else if (trailing && !timerId) {
        timerId = setTimeout(() => {
          invoke();
          timerId = null;
        }, remaining);
      }
    }

    throttled.cleanup = function () {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastTime = 0;
      latestArg = latestThis = null;
    };

    return throttled;
  }

  useEffect(() => {
    async function loadMore() {
      if (loadingRef.current || pageRef.current >= 5) return;
      loadingRef.current = true;
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const res = await fetchItems(controller.signal);
        // Only update state if this specific request was not aborted
        // (This check primarily catches if abort signal was set between await and promise resolution)
        if (!controller.signal.aborted) {
          setData((prev) => [...prev, ...res]);
          pageRef.current = pageRef.current + 1;
          console.log("Successfully fetched data. New page:", pageRef.current);
        } else {
          // This path might be taken if the promise resolved but the signal was already aborted
          // (less likely with direct abort listener, but good to keep as a safeguard)
          console.log(
            "Fetch completed but was already aborted, not updating state (signal)."
          );
        }
      } catch (error) {
        if (error.name === "AbortError" || error.message === "Fetch aborted") {
          console.log("Fetch was intentionally aborted:", error.message);
        } else {
          console.error("Error fetching items:", error);
          // For actual errors (not aborts), we still need to reset loading state
          loadingRef.current = false;
          setIsLoading(false);
          abortControllerRef.current = null; // Clear ref on non-abort error too
        }
      } finally {
        if (
          abortControllerRef.current === controller &&
          // Only finalize if not already finalized by an abort signal
          !controller.signal.aborted
        ) {
          loadingRef.current = false;
          setIsLoading(false);
          abortControllerRef.current = null;
        } else if (controller.signal.aborted) {
          console.log("Ignoring finally for aborted fetch (already handled).");
        } else {
          console.log(
            "Ignoring finally for a stale fetch (another fetch started)."
          );
        }
      }
    }
    loadMore();
    const handleScroll = throttle(
      function () {
        const { scrollTop, scrollHeight, clientHeight } =
          document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          loadMore();
        }
      },
      1000,
      { leading: true, trailing: true }
    );
    // const handleScroll = debounce(function () {
    //   const { scrollTop, scrollHeight, clientHeight } =
    //     document.documentElement;
    //   if (scrollTop + clientHeight >= scrollHeight - 100) {
    //     loadMore();
    //   }
    // }, 2000);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      handleScroll.cleanup();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();

        // State cleanup for abort is now handled directly in fetchItems listener.
        // So abortControllerRef.current will be nullified there.
      }
      loadingRef.current = false;
    };
  }, []);

  return (
    <div>
      {data.length === 0 ? (
        <p>Loading</p>
      ) : (
        <div>
          {data.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
          {isLoading && (
            <p
              style={{
                position: "fixed",
                left: "50%",
                transform: "translateX(-50%)",
                bottom: 10,
                background: "#eee",
                padding: "6px 12px",
                borderRadius: "4px",
              }}
            >
              Loading more items...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

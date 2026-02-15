"use client";

import { useEffect } from "react";
import { safeGetAnalytics } from "../lib/firebase";

export default function FirebaseInit() {
  useEffect(() => {
    let mounted = true;
    safeGetAnalytics()
      .then((analytics) => {
        if (!mounted) return;
        // analytics is available if needed (no-op by default)
      })
      .catch(() => {
        // ignore errors in analytics initialization
      });
    return () => {
      mounted = false;
    };
  }, []);

  return null;
}

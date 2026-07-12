"use client";

import { useEffect } from "react";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";

export function EnterprisePlantRuntime() {
  const tick = useEnterprisePlantStore((state) => state.tick);

  useEffect(() => {
    const timer = window.setInterval(() => {
      tick(1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [tick]);

  return null;
}

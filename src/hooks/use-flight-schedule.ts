"use client";

import { useCallback, useEffect, useState } from "react";

import type { FlightScheduleRecord } from "@/types/persistence";

interface FlightApiResponse {
  success: boolean;
  source: "google-sheets" | "demo";
  expectedPassengers: number;
  flights: FlightScheduleRecord[];
}

interface FlightScheduleState {
  loading: boolean;
  error: string | null;
  source: "google-sheets" | "demo" | null;
  expectedPassengers: number;
  flights: FlightScheduleRecord[];
}

const initialState: FlightScheduleState = {
  loading: true,
  error: null,
  source: null,
  expectedPassengers: 0,
  flights: [],
};

async function fetchFlightSchedule(
  signal?: AbortSignal,
): Promise<FlightApiResponse> {
  const response = await fetch("/api/flights/today", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Flight API returned HTTP ${response.status}.`);
  }

  return (await response.json()) as FlightApiResponse;
}

export function useFlightSchedule() {
  const [state, setState] = useState<FlightScheduleState>(initialState);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialFlights() {
      try {
        const result = await fetchFlightSchedule(controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setState({
          loading: false,
          error: null,
          source: result.source,
          expectedPassengers: result.expectedPassengers,
          flights: result.flights,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Flight schedule failed to load.",
          source: null,
          expectedPassengers: 0,
          flights: [],
        });
      }
    }

    void loadInitialFlights();

    return () => {
      controller.abort();
    };
  }, []);

  const reload = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const result = await fetchFlightSchedule();

      setState({
        loading: false,
        error: null,
        source: result.source,
        expectedPassengers: result.expectedPassengers,
        flights: result.flights,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Flight schedule failed to load.",
      }));
    }
  }, []);

  return {
    ...state,
    reload,
  };
}

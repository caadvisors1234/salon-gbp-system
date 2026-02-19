import React, { createContext, useContext } from "react";
import { useSetupStatus } from "./useSetupStatus";
import type { SetupStatus } from "./useSetupStatus";

type SetupStatusContextValue = SetupStatus & { refetch: () => void };

const SetupStatusContext = createContext<SetupStatusContextValue | null>(null);

export function SetupStatusProvider({ children }: { children: React.ReactNode }) {
  const status = useSetupStatus();
  return <SetupStatusContext.Provider value={status}>{children}</SetupStatusContext.Provider>;
}

export function useSetupStatusContext(): SetupStatusContextValue {
  const ctx = useContext(SetupStatusContext);
  if (!ctx) throw new Error("useSetupStatusContext must be used within SetupStatusProvider");
  return ctx;
}

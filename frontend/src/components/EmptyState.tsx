import React from "react";
import { IconInbox } from "./icons";

export default function EmptyState({
  message = "データがありません",
  icon,
}: {
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-stone-400">
      {icon ?? <IconInbox className="mb-3 h-10 w-10" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

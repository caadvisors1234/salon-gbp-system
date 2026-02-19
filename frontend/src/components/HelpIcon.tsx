import React from "react";
import Tooltip from "./Tooltip";
import { IconHelpCircle } from "./icons";

interface HelpIconProps {
  text: string;
  position?: "top" | "bottom";
}

export default function HelpIcon({ text, position = "top" }: HelpIconProps) {
  return (
    <Tooltip text={text} position={position}>
      <span className="inline-flex cursor-help text-stone-400 hover:text-stone-600 transition-colors">
        <IconHelpCircle className="h-4 w-4" />
      </span>
    </Tooltip>
  );
}

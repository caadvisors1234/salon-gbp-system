import React, { useState, useEffect, useRef } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}

export default function Tooltip({ text, children, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible]);

  const posClass = position === "top"
    ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
    : "top-full left-1/2 -translate-x-1/2 mt-2";

  const arrowClass = position === "top"
    ? "top-full left-1/2 -translate-x-1/2 border-t-stone-800"
    : "bottom-full left-1/2 -translate-x-1/2 border-b-stone-800";

  const arrowBorder = position === "top"
    ? "border-l-transparent border-r-transparent border-b-transparent"
    : "border-l-transparent border-r-transparent border-t-transparent";

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 w-56 rounded-lg bg-stone-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg animate-scale-in ${posClass}`}
        >
          {text}
          <span className={`absolute h-0 w-0 border-4 ${arrowClass} ${arrowBorder}`} />
        </span>
      )}
    </span>
  );
}

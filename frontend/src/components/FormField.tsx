import React from "react";

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export default function FormField({ label, error, children, className = "" }: FormFieldProps) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1.5 text-sm font-medium text-stone-700">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors";

export const selectClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors";

export const textareaClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors";

export const checkboxClass =
  "h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-300";

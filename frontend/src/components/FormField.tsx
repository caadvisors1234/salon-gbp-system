import React, { useId } from "react";

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export default function FormField({ label, error, children, className = "" }: FormFieldProps) {
  const id = useId();
  const inputId = `field-${id}`;
  const errorId = `error-${id}`;
  const describedBy = error ? errorId : undefined;

  const enhanced = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: inputId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className={`block ${className}`}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {enhanced}
      {error && (
        <div id={errorId} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </div>
      )}
    </div>
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

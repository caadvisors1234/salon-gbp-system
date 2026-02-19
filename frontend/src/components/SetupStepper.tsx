import React from "react";
import { IconCheck } from "./icons";

export interface StepDef {
  label: string;
  description?: string;
}

interface SetupStepperProps {
  steps: StepDef[];
  /** 1-indexed current step */
  currentStep: number;
  /** 1-indexed completed steps (all steps <= completedUpTo are done) */
  completedSteps: boolean[];
}

export default function SetupStepper({ steps, currentStep, completedSteps }: SetupStepperProps) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const done = completedSteps[i];
        const active = stepNum === currentStep && !done;
        const isLast = i === steps.length - 1;

        return (
          <li key={i} className="relative flex gap-3">
            {/* Vertical line */}
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-16px)] w-0.5 ${
                  done ? "bg-emerald-300" : "bg-stone-200"
                }`}
              />
            )}

            {/* Circle */}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-pink-500 text-white"
                    : "bg-stone-200 text-stone-500"
              }`}
            >
              {done ? <IconCheck className="h-4 w-4" /> : stepNum}
            </span>

            {/* Text */}
            <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
              <div className={`text-sm font-medium ${done ? "text-emerald-700" : active ? "text-stone-900" : "text-stone-400"}`}>
                {step.label}
              </div>
              {step.description && (
                <div className={`mt-0.5 text-xs ${done ? "text-emerald-600" : active ? "text-stone-500" : "text-stone-400"}`}>
                  {step.description}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

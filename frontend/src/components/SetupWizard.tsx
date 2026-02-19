import React, { useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { SETUP_LABELS } from "../lib/labels";
import { translateError } from "../lib/labels";
import type { SetupStatus } from "../hooks/useSetupStatus";
import SetupStepper from "./SetupStepper";
import SetupLocationPicker from "./SetupLocationPicker";
import Button from "./Button";
import { IconCheck } from "./icons";

const DISMISS_KEY = "setup_wizard_dismissed";

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissed(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(DISMISS_KEY, "1");
    } else {
      localStorage.removeItem(DISMISS_KEY);
    }
  } catch {
    // ignore
  }
}

interface SetupWizardProps {
  status: SetupStatus;
  onRefetch: () => void;
}

export default function SetupWizard({ status, onRefetch }: SetupWizardProps) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [dismissed, setDismissedState] = useState(() => isDismissed());
  const [igError, setIgError] = useState<string | null>(null);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDismissedState(true);
  }, []);

  const handleResume = useCallback(() => {
    setDismissed(false);
    setDismissedState(false);
  }, []);

  // If all complete or status could not be determined, don't show wizard
  if (status.allComplete || status.error) {
    return null;
  }

  // If dismissed but still incomplete, show reminder banner
  if (dismissed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
        <p className="text-sm text-amber-800">{SETUP_LABELS.reminderMessage}</p>
        <button
          className="whitespace-nowrap text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
          onClick={handleResume}
        >
          {SETUP_LABELS.reminderAction}
        </button>
      </div>
    );
  }

  const startGoogleOAuth = async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ redirect_url: string }>("/oauth/google/start", {
        token,
        headers: { "x-requested-with": "fetch" },
      });
      window.location.href = res.redirect_url;
    } catch {
      // Handled by global error handler
    }
  };

  const startInstagramOAuth = async () => {
    if (!token) return;
    setIgError(null);
    try {
      const res = await apiFetch<{ redirect_url: string }>("/oauth/meta/start?account_type=official", {
        token,
        headers: { "x-requested-with": "fetch" },
      });
      window.location.href = res.redirect_url;
    } catch (e: unknown) {
      setIgError(translateError(e instanceof Error ? e.message : String(e)));
    }
  };

  const steps = [
    { label: SETUP_LABELS.step1Title, description: SETUP_LABELS.step1Description },
    { label: SETUP_LABELS.step2Title, description: SETUP_LABELS.step2Description },
    { label: SETUP_LABELS.step3Title, description: SETUP_LABELS.step3Description },
  ];

  const completedSteps = [
    status.googleConnected,
    status.locationSelected,
    status.instagramConnected,
  ];

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm animate-fade-in">
      <div className="border-b border-stone-100 px-5 py-4">
        <h2 className="text-lg font-bold text-stone-900">{SETUP_LABELS.wizardTitle}</h2>
        <p className="mt-1 text-sm text-stone-500">{SETUP_LABELS.wizardDescription}</p>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[200px_1fr]">
        {/* Stepper */}
        <SetupStepper steps={steps} currentStep={status.currentStep} completedSteps={completedSteps} />

        {/* Active step content */}
        <div className="min-h-[120px]">
          {status.currentStep === 1 && !status.googleConnected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-stone-900">{SETUP_LABELS.step1Title}</h3>
                <p className="mt-1 text-sm text-stone-500">{SETUP_LABELS.step1Description}</p>
              </div>
              {status.googleExpired && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Googleアカウントの認証が期限切れです。再連携してください。
                </div>
              )}
              <Button variant="primary" onClick={startGoogleOAuth}>
                {SETUP_LABELS.step1Button}
              </Button>
            </div>
          )}

          {status.currentStep === 2 && status.googleConnected && !status.locationSelected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-stone-900">{SETUP_LABELS.step2Title}</h3>
                <p className="mt-1 text-sm text-stone-500">{SETUP_LABELS.step2Description}</p>
                {status.googleEmail && (
                  <p className="mt-1 text-xs text-emerald-600">
                    連携中: {status.googleEmail}
                  </p>
                )}
              </div>
              <SetupLocationPicker onComplete={onRefetch} />
            </div>
          )}

          {status.currentStep === 3 && status.googleConnected && status.locationSelected && !status.instagramConnected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-stone-900">{SETUP_LABELS.step3Title}</h3>
                <p className="mt-1 text-sm text-stone-500">{SETUP_LABELS.step3Description}</p>
                {status.activeLocationName && (
                  <p className="mt-1 text-xs text-emerald-600">
                    選択中の店舗: {status.activeLocationName}
                  </p>
                )}
              </div>
              {igError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {igError}
                </div>
              )}
              <Button variant="primary" onClick={startInstagramOAuth}>
                {SETUP_LABELS.step3Button}
              </Button>
              <p className="text-xs text-stone-400">{SETUP_LABELS.step3Skip}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-stone-100 px-5 py-3">
        <button
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          onClick={handleDismiss}
        >
          {SETUP_LABELS.dismissButton}
        </button>
      </div>
    </div>
  );
}

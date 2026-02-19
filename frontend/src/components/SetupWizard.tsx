import React, { useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { SETUP_LABELS, HELP_TEXTS } from "../lib/labels";
import { translateError } from "../lib/labels";
import { useMe } from "../lib/me";
import type { SetupStatus } from "../hooks/useSetupStatus";
import SetupStepper from "./SetupStepper";
import SetupLocationPicker from "./SetupLocationPicker";
import Button from "./Button";

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
  const { me } = useMe();
  const isSuperAdmin = me?.role === "super_admin";
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

  // If all complete or status could not be determined, don't show wizard
  if (status.allComplete || status.error) {
    return null;
  }

  // For non-super_admin: Google/Location steps are managed by super_admin.
  // Only show wizard content that salon_admin can act on (Instagram).
  if (!isSuperAdmin) {
    // Google or Location not done → nothing salon_admin can do
    if (!status.googleConnected || !status.locationSelected) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-5 py-3">
          <p className="text-sm text-stone-600">{HELP_TEXTS.adminOnlyGbpConnect}</p>
        </div>
      );
    }
    // Only Instagram remains — show a simple card (no stepper)
    if (!status.instagramConnected) {
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
      return (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm animate-fade-in">
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-medium text-stone-900">{SETUP_LABELS.step3Title}</h3>
              <p className="mt-1 text-sm text-stone-500">{SETUP_LABELS.step3Description}</p>
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
    // All done for salon_admin
    return null;
  }

  // --- super_admin: full wizard with stepper ---

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

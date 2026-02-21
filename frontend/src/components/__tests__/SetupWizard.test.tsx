import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SetupWizard from "../SetupWizard";
import { SETUP_LABELS } from "../../lib/labels";
import type { SetupStatus } from "../../hooks/useSetupStatus";

const mockRole = vi.fn(() => "super_admin");

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    loading: false,
  }),
}));

vi.mock("../../lib/me", () => ({
  useMe: () => ({
    me: { role: mockRole() },
  }),
}));

function makeStatus(partial: Partial<SetupStatus>): SetupStatus {
  return {
    loading: false,
    error: false,
    googleConnected: false,
    googleConnectedGlobally: false,
    googleEmail: null,
    googleExpired: false,
    locationSelected: false,
    activeLocationName: null,
    instagramConnected: false,
    instagramUsername: null,
    allComplete: false,
    currentStep: 1,
    ...partial,
  };
}

describe("SetupWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole.mockReturnValue("super_admin");
  });

  it("shows only two setup steps when Instagram UI is disabled", () => {
    const status = makeStatus({
      currentStep: 1,
      googleConnectedGlobally: false,
      locationSelected: false,
      allComplete: false,
    });

    render(<SetupWizard status={status} onRefetch={vi.fn()} />);

    expect(screen.getAllByText(SETUP_LABELS.step1Title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(SETUP_LABELS.step2Title).length).toBeGreaterThan(0);
    expect(screen.queryByText(SETUP_LABELS.step3Title)).not.toBeInTheDocument();
    expect(screen.queryByText(SETUP_LABELS.step3Button)).not.toBeInTheDocument();
  });

  it("renders nothing for salon_admin when Google and location are already configured", () => {
    mockRole.mockReturnValue("salon_admin");
    const status = makeStatus({
      googleConnected: true,
      googleConnectedGlobally: true,
      locationSelected: true,
      instagramConnected: false,
      allComplete: false,
      currentStep: 2,
    });

    const { container } = render(<SetupWizard status={status} onRefetch={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

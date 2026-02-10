import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth";

// Mock supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

function AuthStatus() {
  const { session, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{session ? `authenticated:${session.user.email}` : "unauthenticated"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("shows loading state initially", () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("provides session after loading", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "tok",
          user: { email: "test@example.com" },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("authenticated:test@example.com")).toBeInTheDocument();
    });
  });

  it("shows unauthenticated when no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("unauthenticated")).toBeInTheDocument();
    });
  });

  it("subscribes to auth state changes", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });
});

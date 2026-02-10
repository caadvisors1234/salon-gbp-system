import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "../ErrorBoundary";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test explosion");
  return <div>child content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("shows error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("予期しないエラーが発生しました")).toBeInTheDocument();
    expect(screen.getByText("Test explosion")).toBeInTheDocument();
  });

  it("recovers on retry button click", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    function ConditionalThrow() {
      if (shouldThrow) throw new Error("Test explosion");
      return <div>child content</div>;
    }
    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("予期しないエラーが発生しました")).toBeInTheDocument();

    // Stop throwing, then click retry
    shouldThrow = false;
    await user.click(screen.getByText("再試行"));
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("予期しないエラーが発生しました")).not.toBeInTheDocument();
  });

  it("resets on resetKeys change", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["a"]}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("予期しないエラーが発生しました")).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={["b"]}>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("calls onError callback", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Test explosion");
  });
});

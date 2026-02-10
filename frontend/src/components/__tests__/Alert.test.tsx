import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Alert from "../Alert";

describe("Alert", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders message", () => {
    render(<Alert variant="success" message="All good" />);
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders success variant with green bg", () => {
    const { container } = render(<Alert variant="success" message="ok" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-emerald-50");
  });

  it("renders error variant with red bg", () => {
    const { container } = render(<Alert variant="error" message="fail" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-red-50");
  });

  it("renders warning variant with amber bg", () => {
    const { container } = render(<Alert variant="warning" message="watch out" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-amber-50");
  });

  it("renders info variant with sky bg", () => {
    const { container } = render(<Alert variant="info" message="fyi" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-sky-50");
  });

  it("shows dismiss button when dismissible", () => {
    render(<Alert variant="error" message="err" dismissible />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("does not show dismiss button when not dismissible", () => {
    render(<Alert variant="error" message="err" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Alert variant="error" message="err" dismissible onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("auto-hides after timeout", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Alert variant="success" message="bye" autoHide onDismiss={onDismiss} />);
    expect(screen.getByText("bye")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

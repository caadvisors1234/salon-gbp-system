import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "../toast";

function TestComponent() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast("success", "成功しました")}>show-success</button>
      <button onClick={() => toast("error", "エラーです")}>show-error</button>
      <button onClick={() => {
        toast("info", "1");
        toast("info", "2");
        toast("info", "3");
        toast("info", "4");
      }}>show-many</button>
    </div>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let counter = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `uuid-${++counter}` });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("displays toast on trigger", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText("show-success"));
    });
    expect(screen.getByText("成功しました")).toBeInTheDocument();
  });

  it("auto-dismisses after 4 seconds", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText("show-success"));
    });
    expect(screen.getByText("成功しました")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByText("成功しました")).not.toBeInTheDocument();
  });

  it("limits to 3 toasts max", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText("show-many"));
    });
    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBeLessThanOrEqual(3);
  });

  it("can be manually dismissed", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText("show-error"));
    });
    expect(screen.getByText("エラーです")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByLabelText("閉じる"));
    });
    expect(screen.queryByText("エラーです")).not.toBeInTheDocument();
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText("show-success"));
    });
    expect(screen.getByText("成功しました")).toBeInTheDocument();
  });
});

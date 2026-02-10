import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge, { statusVariant, severityVariant } from "../Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>pending</Badge>);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("applies default variant styles", () => {
    const { container } = render(<Badge>test</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-stone-100");
  });

  it("applies success variant styles", () => {
    const { container } = render(<Badge variant="success">ok</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-emerald-50");
  });

  it("applies error variant styles", () => {
    const { container } = render(<Badge variant="error">fail</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-red-50");
  });

  it("applies warning variant styles", () => {
    const { container } = render(<Badge variant="warning">warn</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-amber-50");
  });

  it("applies custom className", () => {
    const { container } = render(<Badge className="ml-2">x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("ml-2");
  });
});

describe("statusVariant", () => {
  it("maps posted to success", () => {
    expect(statusVariant("posted")).toBe("success");
  });

  it("maps pending to warning", () => {
    expect(statusVariant("pending")).toBe("warning");
  });

  it("maps failed to error", () => {
    expect(statusVariant("failed")).toBe("error");
  });

  it("maps posting to info", () => {
    expect(statusVariant("posting")).toBe("info");
  });

  it("maps skipped to default", () => {
    expect(statusVariant("skipped")).toBe("default");
  });

  it("maps unknown to default", () => {
    expect(statusVariant("something-else")).toBe("default");
  });
});

describe("severityVariant", () => {
  it("maps critical to error", () => {
    expect(severityVariant("critical")).toBe("error");
  });

  it("maps high to error", () => {
    expect(severityVariant("high")).toBe("error");
  });

  it("maps medium to warning", () => {
    expect(severityVariant("medium")).toBe("warning");
  });

  it("maps low to info", () => {
    expect(severityVariant("low")).toBe("info");
  });

  it("maps unknown to default", () => {
    expect(severityVariant("unknown")).toBe("default");
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireSalonAdmin } from "../../App";

function renderWithRole(role: string) {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <Routes>
        <Route
          path="/settings"
          element={
            <RequireSalonAdmin role={role}>
              <div>protected content</div>
            </RequireSalonAdmin>
          }
        />
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireSalonAdmin", () => {
  it("renders children for salon_admin", () => {
    renderWithRole("salon_admin");
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("renders children for super_admin", () => {
    renderWithRole("super_admin");
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("redirects staff to dashboard", () => {
    renderWithRole("staff");
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("redirects unknown roles to dashboard", () => {
    renderWithRole("unknown_role");
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("shows loading spinner when role is empty", () => {
    const { container } = renderWithRole("");
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

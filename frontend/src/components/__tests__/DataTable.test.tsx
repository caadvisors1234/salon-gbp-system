import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataTable, { Column } from "../DataTable";

type Item = { id: string; name: string; value: number };

const columns: Column<Item>[] = [
  { key: "name", header: "Name", render: (i) => <span>{i.name}</span> },
  { key: "value", header: "Value", render: (i) => <span>{i.value}</span> },
];

const data: Item[] = [
  { id: "1", name: "Alice", value: 10 },
  { id: "2", name: "Bob", value: 20 },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} rowKey={(i) => i.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(<DataTable columns={columns} data={data} rowKey={(i) => i.id} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    const { container } = render(
      <DataTable columns={columns} data={[]} rowKey={(i) => i.id} loading />
    );
    // Skeleton rows should be rendered (5 rows)
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(5);
  });

  it("shows empty message when data is empty", () => {
    render(
      <DataTable columns={columns} data={[]} rowKey={(i) => i.id} emptyMessage="No items" />
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("shows default empty message", () => {
    render(<DataTable columns={columns} data={[]} rowKey={(i) => i.id} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey={(i) => i.id}
        onRowClick={onRowClick}
      />
    );
    await user.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it("adds cursor-pointer class when onRowClick is provided", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={data}
        rowKey={(i) => i.id}
        onRowClick={() => {}}
      />
    );
    const row = container.querySelector("tbody tr");
    expect(row?.className).toContain("cursor-pointer");
  });

  it("does not add cursor-pointer when no onRowClick", () => {
    const { container } = render(
      <DataTable columns={columns} data={data} rowKey={(i) => i.id} />
    );
    const row = container.querySelector("tbody tr");
    expect(row?.className).not.toContain("cursor-pointer");
  });
});

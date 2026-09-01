import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("<AppShell />", () => {
  it("mostra il titolo dell'app e i contenuti", () => {
    render(<AppShell>contenuto di prova</AppShell>);
    expect(screen.getByRole("heading", { name: "Gym Tracker" })).toBeInTheDocument();
    expect(screen.getByText("contenuto di prova")).toBeInTheDocument();
  });

  it("espone la navigazione principale", () => {
    render(<AppShell>x</AppShell>);
    expect(screen.getByRole("navigation", { name: "Navigazione principale" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Allena/ })).toBeInTheDocument();
  });
});

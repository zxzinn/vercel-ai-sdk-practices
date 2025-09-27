import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("Page", () => {
  it("renders without crashing", () => {
    render(<Page />);
    expect(screen.getByText(/Get started by editing/)).toBeInTheDocument();
  });
});

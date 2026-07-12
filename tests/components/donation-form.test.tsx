// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonationForm } from "@/components/donations/donation-form";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const donors = [{ id: "donor-1", name: "Alice", isAnonymous: false }];
const recipients = [{ id: "recipient-1", name: "Bob" }];

describe("DonationForm", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
    pushMock.mockReset();
  });

  it("renders the amount field and defaults to a POOLED donation", () => {
    render(<DonationForm onSubmit={vi.fn()} donors={donors} recipients={recipients} />);
    expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
    expect(screen.getByLabelText(/pooled/i)).toBeChecked();
  });

  it("hides the donor picker when marked anonymous", async () => {
    const user = userEvent.setup();
    render(<DonationForm onSubmit={vi.fn()} donors={donors} recipients={recipients} />);

    expect(screen.getByText("Donor")).toBeInTheDocument();
    await user.click(screen.getByLabelText(/anonymous donation/i));
    expect(screen.queryByText("Donor")).not.toBeInTheDocument();
  });

  it("shows the designated-recipient picker only when type is DESIGNATED", async () => {
    const user = userEvent.setup();
    render(<DonationForm onSubmit={vi.fn()} donors={donors} recipients={recipients} />);

    expect(screen.queryByText("Designated recipient")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/designated for specific/i));
    expect(screen.getByText("Designated recipient")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when amount is left blank", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DonationForm onSubmit={onSubmit} donors={donors} recipients={recipients} />);

    await user.click(screen.getByRole("button", { name: /save donation/i }));

    expect(await screen.findByText(/expected number, received nan/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits and navigates to /donations on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DonationForm onSubmit={onSubmit} donors={donors} recipients={recipients} />);

    await user.click(screen.getByLabelText(/anonymous donation/i));
    await user.type(screen.getByPlaceholderText("0"), "500");
    await user.click(screen.getByRole("button", { name: /save donation/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, isAnonymous: true, type: "POOLED" }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/donations");
  });

  it("surfaces a server error via toast and inline message without navigating", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<DonationForm onSubmit={onSubmit} donors={donors} recipients={recipients} />);

    await user.click(screen.getByLabelText(/anonymous donation/i));
    await user.type(screen.getByPlaceholderText("0"), "500");
    await user.click(screen.getByRole("button", { name: /save donation/i }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith("boom");
    expect(pushMock).not.toHaveBeenCalled();
  });
});

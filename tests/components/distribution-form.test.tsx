// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DistributionForm } from "@/components/distributions/distribution-form";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const getDesignatedDonationsForRecipientMock = vi.fn();
vi.mock("@/app/(dashboard)/distributions/actions", () => ({
  getDesignatedDonationsForRecipient: (...args: unknown[]) =>
    getDesignatedDonationsForRecipientMock(...args),
}));

const RECIPIENT_ID = "11111111-1111-4111-8111-111111111111";
const recipients = [{ id: RECIPIENT_ID, name: "Bob" }];

describe("DistributionForm", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
    pushMock.mockReset();
    getDesignatedDonationsForRecipientMock.mockReset();
  });

  it("renders recipient, amount, and purpose fields", () => {
    render(<DistributionForm onSubmit={vi.fn()} recipients={recipients} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/monthly ration/i)).toBeInTheDocument();
  });

  it("loads and shows designated donations for the selected recipient", async () => {
    getDesignatedDonationsForRecipientMock.mockResolvedValue([
      { id: "donation-1", amount: 1000, remaining: 600, date: new Date("2026-01-01") },
    ]);
    const user = userEvent.setup();
    render(<DistributionForm onSubmit={vi.fn()} recipients={recipients} />);
    const recipientSelect = screen.getByRole("combobox");

    expect(screen.queryByText(/link to designated donation/i)).not.toBeInTheDocument();
    await user.selectOptions(recipientSelect, RECIPIENT_ID);

    expect(getDesignatedDonationsForRecipientMock).toHaveBeenCalledWith(RECIPIENT_ID);
    expect(await screen.findByText(/link to designated donation/i)).toBeInTheDocument();
    expect(screen.getByText(/PKR 600 remaining/)).toBeInTheDocument();
  });

  it("clears designated donations when the recipient is deselected", async () => {
    getDesignatedDonationsForRecipientMock.mockResolvedValue([
      { id: "donation-1", amount: 1000, remaining: 600, date: new Date("2026-01-01") },
    ]);
    const user = userEvent.setup();
    render(<DistributionForm onSubmit={vi.fn()} recipients={recipients} />);
    const recipientSelect = screen.getByRole("combobox");

    await user.selectOptions(recipientSelect, RECIPIENT_ID);
    expect(await screen.findByText(/link to designated donation/i)).toBeInTheDocument();

    await user.selectOptions(recipientSelect, "");
    expect(screen.queryByText(/link to designated donation/i)).not.toBeInTheDocument();
  });

  it("shows a validation error when submitted without a recipient", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DistributionForm onSubmit={onSubmit} recipients={recipients} />);

    await user.type(screen.getByPlaceholderText("0"), "100");
    await user.type(screen.getByPlaceholderText(/monthly ration/i), "Groceries");
    await user.click(screen.getByRole("button", { name: /save distribution/i }));

    expect(await screen.findByText(/select a recipient/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits and navigates to /distributions on success", async () => {
    getDesignatedDonationsForRecipientMock.mockResolvedValue([]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DistributionForm onSubmit={onSubmit} recipients={recipients} />);

    await user.selectOptions(screen.getByRole("combobox"), RECIPIENT_ID);
    await user.type(screen.getByPlaceholderText("0"), "250");
    await user.type(screen.getByPlaceholderText(/monthly ration/i), "Groceries");
    await user.click(screen.getByRole("button", { name: /save distribution/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: RECIPIENT_ID, amount: 250, purpose: "Groceries" }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/distributions");
  });

  it("surfaces a balance-exceeded server error without navigating", async () => {
    getDesignatedDonationsForRecipientMock.mockResolvedValue([]);
    const onSubmit = vi.fn().mockRejectedValue(new Error("exceeds remaining balance of PKR 100"));
    const user = userEvent.setup();
    render(<DistributionForm onSubmit={onSubmit} recipients={recipients} />);

    await user.selectOptions(screen.getByRole("combobox"), RECIPIENT_ID);
    await user.type(screen.getByPlaceholderText("0"), "9999");
    await user.type(screen.getByPlaceholderText(/monthly ration/i), "Groceries");
    await user.click(screen.getByRole("button", { name: /save distribution/i }));

    expect(await screen.findByText(/exceeds remaining balance/i)).toBeInTheDocument();
    expect(toastError).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

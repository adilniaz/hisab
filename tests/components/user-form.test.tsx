// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserForm } from "@/components/users/user-form";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const setUserScopeMock = vi.fn();
vi.mock("@/app/(dashboard)/users/actions", () => ({
  setUserScope: (...args: unknown[]) => setUserScopeMock(...args),
}));

const allDonors = [{ id: "donor-1", name: "Alice", isAnonymous: false }];
const allRecipients = [{ id: "recipient-1", name: "Bob" }];

describe("UserForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    setUserScopeMock.mockReset();
  });

  it("renders name, email, and password inputs", () => {
    const { container } = render(<UserForm onSubmit={vi.fn()} />);
    expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument();
  });

  it("only shows the donor/recipient checklists when scope is RESTRICTED", async () => {
    const user = userEvent.setup();
    render(
      <UserForm onSubmit={vi.fn()} allDonors={allDonors} allRecipients={allRecipients} />,
    );

    expect(screen.queryByText(/donors they can see/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/restricted to assigned only/i));
    expect(screen.getByText(/donors they can see/i)).toBeInTheDocument();
    expect(screen.getByText(/recipients they can see/i)).toBeInTheDocument();
  });

  it("submits the FormData-derived fields and navigates to /users", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = render(<UserForm onSubmit={onSubmit} />);

    await user.type(container.querySelector('input[name="name"]')!, "New User");
    await user.type(container.querySelector('input[name="email"]')!, "new@t.com");
    await user.type(container.querySelector('input[name="password"]')!, "supersecret1");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New User", email: "new@t.com", password: "supersecret1" }),
      ),
    );
    expect(setUserScopeMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/users");
  });

  it("calls setUserScope with the selected donors/recipients when editing a RESTRICTED user", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <UserForm
        onSubmit={onSubmit}
        userId="user-1"
        defaultValues={{ name: "Existing", email: "existing@t.com", scopeType: "RESTRICTED" }}
        allDonors={allDonors}
        allRecipients={allRecipients}
      />,
    );

    await user.click(screen.getByLabelText("Alice"));
    await user.click(screen.getByRole("button", { name: /save user/i }));

    await waitFor(() =>
      expect(setUserScopeMock).toHaveBeenCalledWith("user-1", ["donor-1"], []),
    );
    expect(pushMock).toHaveBeenCalledWith("/users");
  });

  it("shows an error message when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("email already in use"));
    const user = userEvent.setup();
    const { container } = render(<UserForm onSubmit={onSubmit} />);

    await user.type(container.querySelector('input[name="name"]')!, "New User");
    await user.type(container.querySelector('input[name="email"]')!, "dupe@t.com");
    await user.type(container.querySelector('input[name="password"]')!, "supersecret1");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByText("email already in use")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

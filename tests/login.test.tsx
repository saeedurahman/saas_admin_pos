import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/LoginForm";

async function fillAndSubmit(code = "123456") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "owner@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse");
  if (code) await user.type(screen.getByLabelText("6-digit code"), code);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("login flow", () => {
  it("asks for all three fields before calling the server", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByText(/6-digit code from your authenticator/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a code that is not 6 digits", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<LoginForm />);
    await fillAndSubmit("123");
    expect(await screen.findByText(/6-digit code from your authenticator/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts credentials to the login route and continues on success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ admin: { id: "1", email: "owner@example.com", name: "Owner" } }), { status: 200 }),
    );
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    await fillAndSubmit();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ email: "owner@example.com", password: "correct horse", totp_code: "123456" });
    expect(localStorage.length).toBe(0); // token never touches browser storage
  });

  it("shows the server message and clears the code on a wrong login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "Wrong email, password or code." }), { status: 401 }));
    render(<LoginForm />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email, password or code.");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("");
  });
});

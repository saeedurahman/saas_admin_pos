import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordPaymentForm } from "@/components/RecordPaymentForm";

const setup = () => {
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(<RecordPaymentForm businessId="b1" businessName="Ali Store" onClose={onClose} onDone={onDone} />);
  return { onClose, onDone, user: userEvent.setup() };
};

describe("record payment form", () => {
  it("validates amount and reference before sending", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Save payment" }));
    expect(await screen.findByText(/Enter the amount received/)).toBeInTheDocument();
    expect(screen.getByText(/Enter the transaction ID/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not require a reference for cash", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const { user, onDone } = setup();
    await user.type(screen.getByLabelText(/Amount received/), "3000");
    await user.selectOptions(screen.getByLabelText("Paid by"), "cash");
    await user.click(screen.getByRole("button", { name: "Save payment" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("sends the payment through the proxy and closes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const { user, onClose, onDone } = setup();
    await user.type(screen.getByLabelText(/Amount received/), "3000");
    await user.type(screen.getByLabelText(/Transaction ID/), "TX123");
    await user.clear(screen.getByLabelText("Months paid for"));
    await user.type(screen.getByLabelText("Months paid for"), "3");
    await user.click(screen.getByRole("button", { name: "Save payment" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onDone).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/proxy/platform/businesses/b1/payments");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ amount_pkr: 3000, method: "jazzcash", reference: "TX123", period_months: 3 });
  });

  it("shows the server error and stays open", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "Business is suspended." }), { status: 400 }));
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText(/Amount received/), "3000");
    await user.type(screen.getByLabelText(/Transaction ID/), "TX1");
    await user.click(screen.getByRole("button", { name: "Save payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Business is suspended.");
    expect(onClose).not.toHaveBeenCalled();
  });
});

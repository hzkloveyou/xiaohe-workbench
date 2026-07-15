import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthDialog, type AuthClient } from "../src/features/auth/AuthDialog";

function createClient(): AuthClient {
  return {
    login: vi.fn(),
    register: vi.fn().mockResolvedValue({
      user: { id: "u1", username: "xiaohe" },
      recoveryCode: "ABCD-EFGH-IJKL"
    }),
    recover: vi.fn(),
    logout: vi.fn(),
    session: vi.fn()
  };
}

describe("AuthDialog", () => {
  it("disables the form while registering and shows the one-time recovery code", async () => {
    const client = createClient();
    render(<AuthDialog open client={client} onClose={() => undefined} onAuthenticated={() => undefined} />);
    fireEvent.click(screen.getByRole("tab", { name: "注册" }));
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "xiaohe" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "long-password-123" } });
    fireEvent.submit(screen.getByRole("button", { name: "创建账户" }).closest("form")!);

    expect(screen.getByRole("button", { name: "正在创建…" })).toBeDisabled();
    expect(await screen.findByText("ABCD-EFGH-IJKL")).toBeInTheDocument();
    expect(screen.getByText(/只显示这一次/)).toBeInTheDocument();
  });

  it("surfaces API errors without closing the dialog", async () => {
    const client = createClient();
    vi.mocked(client.login).mockRejectedValue(new Error("用户名或密码不正确"));
    render(<AuthDialog open client={client} onClose={() => undefined} onAuthenticated={() => undefined} />);
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "xiaohe" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "wrong-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "登录并同步" }).closest("form")!);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("用户名或密码不正确"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

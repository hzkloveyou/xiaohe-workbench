import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "secondary", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`button button--${variant} ${className}`.trim()} {...props} />;
}

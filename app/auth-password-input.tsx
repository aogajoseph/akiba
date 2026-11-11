"use client";

import { useState, type ChangeEvent } from "react";

type PasswordInputProps = {
  name: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  onValueChange?: (value: string) => void;
};

export default function PasswordInput({
  name,
  autoComplete,
  required = false,
  minLength,
  onValueChange,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange?.(event.target.value);
  }

  return (
    <span className="auth-password-field">
      <input
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        onChange={handleChange}
      />
      <button
        className="auth-password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.7 4.2 10 7-0.5 1.1-1.4 2.5-2.7 3.7M6.2 6.2C3.9 7.7 2.5 10 2 12c1.3 2.8 4.8 7 10 7 1.2 0 2.3-.2 3.3-.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}

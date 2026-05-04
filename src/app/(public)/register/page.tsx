"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { authService } from "@/lib/services";
import Link from "next/link";
import { getApiErrorMessage, getApiStatus } from "@/lib/errors";

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

function validate(
  username: string,
  email: string,
  password: string
): FieldErrors {
  const errors: FieldErrors = {};
  if (username.length < 3) errors.username = "Must be at least 3 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email";
  if (password.length < 8) errors.password = "Must be at least 8 characters";
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setTokens } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const errors = validate(username, email, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const { data } = await authService.register(username, email, password);
      await setTokens(data.data.accessToken, data.data.refreshToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Registration failed");
      if (getApiStatus(err) === 409) {
        if (msg.toLowerCase().includes("username")) {
          setFieldErrors({ username: "Username already taken" });
        } else if (msg.toLowerCase().includes("email")) {
          setFieldErrors({ email: "Email already registered" });
        } else {
          setServerError(msg);
        }
      } else {
        setServerError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (hasError?: string) => ({
    borderColor: hasError
      ? "rgba(239, 68, 68, 0.4)"
      : undefined,
  });

  return (
    <div
      className="mesh-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="animate-fade-in"
        style={{ width: "100%", maxWidth: 400 }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-light))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                fontWeight: 700,
                color: "#000",
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
              }}
            >
              Runnix
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
            Create your free account
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card-static" style={{ padding: 28 }}>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors((p) => ({ ...p, username: undefined }));
                }}
                className="input-dark"
                style={inputStyle(fieldErrors.username)}
                placeholder="johndoe"
                autoComplete="username"
                required
              />
              {fieldErrors.username && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--red)",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                className="input-dark"
                style={inputStyle(fieldErrors.email)}
                placeholder="john@example.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--red)",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                className="input-dark"
                style={inputStyle(fieldErrors.password)}
                placeholder="8+ characters"
                autoComplete="new-password"
                required
              />
              {fieldErrors.password && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--red)",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {serverError && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--red)",
                  background: "var(--red-muted)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                }}
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(0,0,0,0.2)",
                      borderTopColor: "#000",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 24,
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--accent-light)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.textDecoration = "underline")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.textDecoration = "none")
            }
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
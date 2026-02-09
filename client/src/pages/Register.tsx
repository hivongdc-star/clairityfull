import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppContext } from "../App";
import { register, login } from "../auth";

export default function RegisterPage() {
  const { t } = useTranslation();
  const ctx = useContext(AppContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register(email, password);
      await login(email, password);
      await ctx?.reloadUser();
      navigate("/");
    } catch (e: any) {
      setErr(e?.message ?? "Register failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        padding: 16
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          background: "white",
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 16
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>{t("register")}</h1>
        <p style={{ marginTop: 6, color: "#666" }}>{t("appName")}</p>

        <label style={{ display: "block", marginTop: 12, fontSize: 12 }}>{t("email")}</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <label style={{ display: "block", marginTop: 12, fontSize: 12 }}>
          {t("password")} (min 8)
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          required
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        {err && (
          <div style={{ marginTop: 12, color: "#b00020", fontSize: 13 }}>
            {t("error")}: {err}
          </div>
        )}

        <button
          disabled={busy}
          type="submit"
          style={{
            width: "100%",
            marginTop: 14,
            padding: 10,
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "white",
            cursor: "pointer"
          }}
        >
          {busy ? "..." : t("register")}
        </button>

        <div style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/login">{t("login")}</Link>
        </div>
      </form>
    </div>
  );
}

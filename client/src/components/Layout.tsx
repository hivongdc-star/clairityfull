import React, { useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppContext } from "../App";

const NavItem: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const { pathname } = useLocation();
  const active = pathname === to || (to === "/" && pathname === "/");
  return (
    <Link
      to={to}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        textDecoration: "none",
        color: active ? "white" : "#111",
        background: active ? "#111" : "transparent"
      }}
    >
      {label}
    </Link>
  );
};

export default function Layout() {
  const { t } = useTranslation();
  const ctx = useContext(AppContext);
  if (!ctx) return null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#fafafa" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          borderBottom: "1px solid #e5e5e5",
          background: "white",
          position: "sticky",
          top: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>{t("appName")}</div>
          <nav style={{ display: "flex", gap: 6 }}>
            <NavItem to="/" label={t("analyze")} />
            <NavItem to="/snippets" label={t("snippets")} />
            <NavItem to="/settings" label={t("settings")} />
          </nav>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#555" }}>{ctx.user?.email}</div>
          <button
            onClick={ctx.onLogout}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "8px 10px",
              background: "white",
              cursor: "pointer"
            }}
          >
            {t("logout")}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: 18 }}>
        <Outlet />
      </main>
    </div>
  );
}

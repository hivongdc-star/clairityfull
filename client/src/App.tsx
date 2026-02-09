import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { me, logout, getSettings } from "./auth";
import type { User, Settings } from "./auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import HomePage from "./pages/Home";
import SnippetsPage from "./pages/Snippets";
import SettingsPage from "./pages/Settings";

export type AppContextValue = {
  user: User | null;
  settings: Settings | null;
  reloadUser: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export const AppContext = React.createContext<AppContextValue | null>(null);

const Protected: React.FC<{ children: React.ReactNode; user: User | null }> = ({
  children,
  user
}) => {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const navigate = useNavigate();

  const reloadUser = async () => {
    try {
      const u = await me();
      setUser(u);
      const s = await getSettings();
      setSettings(s);
      i18n.changeLanguage(s.uiLocale);
    } catch {
      setUser(null);
      setSettings(null);
    }
  };

  useEffect(() => {
    reloadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    await logout();
    setUser(null);
    setSettings(null);
    navigate("/login");
  };

  const ctx = useMemo<AppContextValue>(
    () => ({ user, settings, reloadUser, onLogout }),
    [user, settings]
  );

  return (
    <AppContext.Provider value={ctx}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            <Protected user={user}>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="snippets" element={<SnippetsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppContext.Provider>
  );
}

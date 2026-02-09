import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppContext } from "../App";
import { updateSettings } from "../auth";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const ctx = useContext(AppContext);

  const [uiLocale, setUiLocale] = useState(ctx?.settings?.uiLocale ?? "en");
  const [defaultMode, setDefaultMode] = useState(ctx?.settings?.defaultMode ?? "auto");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const save = async () => {
    setErr(null);
    setOk(false);
    setBusy(true);
    try {
      await updateSettings({ uiLocale: uiLocale as any, defaultMode: defaultMode as any });
      await ctx?.reloadUser();
      i18n.changeLanguage(uiLocale);
      setOk(true);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>{t("settings")}</h2>

      <div style={{ background: "white", border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
        <label style={{ display: "block", fontSize: 12, color: "#555" }}>{t("language")}</label>
        <select
          value={uiLocale}
          onChange={(e) => setUiLocale(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6 }}
        >
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
          <option value="ja">日本語</option>
        </select>

        <label style={{ display: "block", marginTop: 12, fontSize: 12, color: "#555" }}>
          {t("defaultMode")}
        </label>
        <select
          value={defaultMode}
          onChange={(e) => setDefaultMode(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6 }}
        >
          <option value="auto">{t("auto")}</option>
          <option value="casual">{t("casual")}</option>
          <option value="friendly">{t("friendly")}</option>
          <option value="business">{t("business")}</option>
        </select>

        {err && (
          <div style={{ marginTop: 12, color: "#b00020", fontSize: 13 }}>
            {t("error")}: {err}
          </div>
        )}

        {ok && <div style={{ marginTop: 12, color: "#0a7", fontSize: 13 }}>Saved.</div>}

        <button
          disabled={busy}
          onClick={save}
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "white",
            cursor: "pointer"
          }}
        >
          {busy ? "..." : "Save"}
        </button>
      </div>
    </div>
  );
}

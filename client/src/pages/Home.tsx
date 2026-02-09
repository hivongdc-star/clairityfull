import React, { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppContext } from "../App";
import { apiFetch } from "../api";

type AnalyzeMode = "auto" | "casual" | "friendly" | "business";

type AnalysisResult = {
  languageDetected: string;
  summary: string;
  keyPoints: string[];
  replySuggestions: { style: string; text: string }[];
  riskNotes: string[];
};

export default function HomePage() {
  const { t } = useTranslation();
  const ctx = useContext(AppContext);

  const defaultMode = ctx?.settings?.defaultMode ?? "auto";
  const [mode, setMode] = useState<AnalyzeMode>(defaultMode);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const canRun = useMemo(() => text.trim().length > 0 && !busy, [text, busy]);

  const run = async (save?: boolean, snippetId?: string) => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch<{
        analysisId?: string;
        result: AnalysisResult;
        mode: AnalyzeMode;
        uiLocale: string;
      }>("/analyze", {
        method: "POST",
        body: JSON.stringify({
          text,
          mode,
          save,
          snippetId
        })
      });

      setResult(res.result);
      setAnalysisId(res.analysisId ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveSnippet = async () => {
    setErr(null);
    setBusy(true);
    try {
      const sn = await apiFetch<{ id: string }>("/snippets", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() || undefined, content: text })
      });

      await run(true, sn.id);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t("analyze")}</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#555" }}>{t("mode")}</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as AnalyzeMode)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="auto">{t("auto")}</option>
            <option value="casual">{t("casual")}</option>
            <option value="friendly">{t("friendly")}</option>
            <option value="business">{t("business")}</option>
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("snippetTitle")}
            style={{
              flex: 1,
              minWidth: 180,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #ddd"
            }}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("text")}
          rows={8}
          style={{
            width: "100%",
            resize: "vertical",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
            fontFamily: "inherit"
          }}
        />

        {err && (
          <div style={{ color: "#b00020", fontSize: 13 }}>
            {t("error")}: {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            disabled={!canRun}
            onClick={() => run(false)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: "#111",
              color: "white",
              cursor: "pointer"
            }}
          >
            {busy ? "..." : t("run")}
          </button>

          <button
            disabled={!canRun}
            onClick={() => run(true)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "white",
              cursor: "pointer"
            }}
          >
            {t("saveAnalysis")}
          </button>

          <button
            disabled={!canRun}
            onClick={() => saveSnippet()}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "white",
              cursor: "pointer"
            }}
          >
            {t("saveSnippet")}
          </button>

          {analysisId && (
            <div style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>
              analysisId: {analysisId}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div style={{ marginTop: 16, background: "white", border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>{t("result")}</h3>

          <div style={{ fontSize: 12, color: "#666" }}>
            languageDetected: {result.languageDetected}
          </div>

          <h4 style={{ marginBottom: 6 }}>{t("summary")}</h4>
          <div style={{ whiteSpace: "pre-wrap" }}>{result.summary}</div>

          <h4 style={{ marginBottom: 6, marginTop: 14 }}>{t("keyPoints")}</h4>
          <ul style={{ marginTop: 0 }}>
            {result.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>

          <h4 style={{ marginBottom: 6, marginTop: 14 }}>{t("replies")}</h4>
          <div style={{ display: "grid", gap: 10 }}>
            {result.replySuggestions.map((r, i) => (
              <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 12, color: "#666" }}>{r.style}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{r.text}</div>
              </div>
            ))}
          </div>

          {result.riskNotes.length > 0 && (
            <>
              <h4 style={{ marginBottom: 6, marginTop: 14 }}>riskNotes</h4>
              <ul style={{ marginTop: 0 }}>
                {result.riskNotes.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

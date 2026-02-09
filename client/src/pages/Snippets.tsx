import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../api";

type SnippetListItem = { id: string; title: string | null; created_at: string };
type Snippet = { id: string; title: string | null; content: string; created_at: string };

export default function SnippetsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<SnippetListItem[]>([]);
  const [selected, setSelected] = useState<Snippet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setErr(null);
    try {
      const res = await apiFetch<{ items: SnippetListItem[] }>("/snippets", { method: "GET" });
      setItems(res.items);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (id: string) => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ snippet: Snippet }>(`/snippets/${id}`, { method: "GET" });
      setSelected(res.snippet);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch<{ ok: boolean }>(`/snippets/${id}`, { method: "DELETE" });
      setSelected(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const analyzeSelected = async () => {
    if (!selected) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch("/analyze", {
        method: "POST",
        body: JSON.stringify({
          text: selected.content,
          save: true,
          snippetId: selected.id
        })
      });
      alert("Saved analysis.");
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t("snippets")}</h2>

      {err && (
        <div style={{ color: "#b00020", fontSize: 13, marginBottom: 12 }}>
          {t("error")}: {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12 }}>
        <div style={{ background: "white", border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            {items.length} items
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => open(it.id)}
                disabled={busy}
                style={{
                  textAlign: "left",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 10,
                  background: selected?.id === it.id ? "#111" : "white",
                  color: selected?.id === it.id ? "white" : "#111",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: 600 }}>{it.title || "(no title)"}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(it.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
          {!selected ? (
            <div style={{ color: "#666" }}>Select a snippet</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.title || "(no title)"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {new Date(selected.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={analyzeSelected}
                    disabled={busy}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    {t("analyze")}
                  </button>
                  <button
                    onClick={() => del(selected.id)}
                    disabled={busy}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #b00020",
                      color: "#b00020",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  background: "#fafafa",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  maxHeight: 520,
                  overflow: "auto"
                }}
              >
                {selected.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

type LayoutSummary = {
  navs: any[];
  sections: any[];
  buttons: any[];
  headings: any[];
  textBlocks: any[];
};

type FetchResult = {
  screenshot: string;
  html: string;
  layout: LayoutSummary;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [llmHtml, setLlmHtml] = useState<string>("");
  const [llmCss, setLlmCss] = useState<string>("");
  const [siteHtml, setSiteHtml] = useState<string>("");
  const [siteCss, setSiteCss] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [waitForLazyLoad, setWaitForLazyLoad] = useState<boolean>(true);
  const [maxWaitTime, setMaxWaitTime] = useState<number>(30000);
  const screenshotRef = useRef<HTMLAnchorElement>(null);
  const codeRef = useRef<HTMLAnchorElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Call backend LLM API to generate code
  async function generateCode(layout: LayoutSummary, screenshot: string) {
    try {
      const res = await fetch("/api/generate-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, screenshot, apiKey: apiKey.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate code");
      }
      const data = await res.json();
      setLlmHtml(data.html || "");
      setLlmCss(data.css || "");
    } catch (err: any) {
      setLlmHtml("<!-- Error generating code -->");
      setLlmCss("/* Error generating code */");
    }
  }

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLlmHtml("");
    setLlmCss("");
    try {
      const res = await fetch("/api/fetch-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, waitForLazyLoad, maxWaitTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch site");
      }
      const data = await res.json();
      console.log('Received data:', { 
        hasHtml: !!data.html, 
        htmlLength: data.html?.length || 0,
        hasCss: !!data.css,
        cssLength: data.css?.length || 0,
        hasScreenshot: !!data.screenshot 
      });
      setResult(data);
      setSiteHtml(data.html || "");
      setSiteCss(data.css || "");
      await generateCode(data.layout, data.screenshot);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadScreenshot() {
    if (!result) return;
    const link = screenshotRef.current;
    if (link) {
      link.href = "data:image/png;base64," + result.screenshot;
      link.download = "screenshot.png";
      link.click();
    }
  }

  function handleDownloadClonedCode() {
    const blob = new Blob(
      [
        "<!-- HTML -->\n",
        siteHtml,
        "\n\n<!-- CSS -->\n<style>\n",
        siteCss,
        "\n</style>",
      ],
      { type: "text/html" }
    );
    const link = codeRef.current;
    if (link) {
      link.href = URL.createObjectURL(blob);
      link.download = "clone.html";
      link.click();
    }
  }

  const updatePreview = useCallback(() => {
    if (previewRef.current && siteHtml) {
      const previewContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            ${siteCss || ''}
          </style>
        </head>
        <body>
          ${siteHtml}
        </body>
        </html>
      `;
      
      const blob = new Blob([previewContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewRef.current.src = url;
      
      // Clean up the blob URL after a delay to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, [siteHtml, siteCss]);

  // Automatically update preview when HTML/CSS changes
  useEffect(() => {
    if (siteHtml) {
      updatePreview();
    }
  }, [siteHtml, siteCss, updatePreview]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", padding: 0 }}>
      <form
        onSubmit={handleFetch}
        style={{
          display: "flex",
          gap: 8,
          padding: 24,
          background: "#fff",
          borderBottom: "1px solid #eee",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <input
          type="url"
          placeholder="Enter website URL (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{
            width: 400,
            padding: 8,
            fontSize: 16,
            border: "1px solid #ccc",
            borderRadius: 4,
          }}
        />
        <input
          type="password"
          placeholder="OpenAI API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          style={{
            width: 260,
            padding: 8,
            fontSize: 16,
            border: "1px solid #ccc",
            borderRadius: 4,
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, color: "#666" }}>
          <input
            type="checkbox"
            checked={waitForLazyLoad}
            onChange={(e) => setWaitForLazyLoad(e.target.checked)}
            style={{ margin: 0 }}
          />
          Wait for lazy loading
        </label>
        <select
          value={maxWaitTime}
          onChange={(e) => setMaxWaitTime(Number(e.target.value))}
          style={{
            padding: 8,
            fontSize: 14,
            border: "1px solid #ccc",
            borderRadius: 4,
            color: "#666"
          }}
        >
          <option value={15000}>15s timeout</option>
          <option value={30000}>30s timeout</option>
          <option value={60000}>60s timeout</option>
          <option value={120000}>120s timeout</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 20px",
            fontSize: 16,
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Fetching..." : "Fetch"}
        </button>
      </form>
      {error && (
        <div
          style={{
            color: "#fff",
            background: "#e00",
            padding: 12,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: 16,
          padding: 24,
          minHeight: "70vh",
        }}
      >
        {/* Screenshot */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #0001", padding: 16 }}>
          <h3>Original Screenshot</h3>
          {result?.screenshot ? (
            <>
              <img
                src={`data:image/png;base64,${result.screenshot}`}
                alt="Screenshot"
                style={{ width: "100%", borderRadius: 4, border: "1px solid #eee" }}
              />
              <button
                onClick={handleDownloadScreenshot}
                style={{
                  marginTop: 8,
                  padding: "6px 16px",
                  fontSize: 14,
                  background: "#0070f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Download Screenshot
              </button>
              <a ref={screenshotRef} style={{ display: "none" }} />
            </>
          ) : (
            <div style={{ color: "#888" }}>No screenshot yet.</div>
          )}
        </div>

        {/* Live Preview */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #0001", padding: 16 }}>
          <h3>Live Preview</h3>
          {siteHtml ? (
            <>
              <iframe
                ref={previewRef}
                style={{
                  width: "100%",
                  height: "400px",
                  border: "1px solid #eee",
                  borderRadius: 4,
                  background: "#fff"
                }}
                title="Live Preview"
                                 sandbox="allow-same-origin allow-scripts"
              />
                             <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <span style={{ fontSize: 12, color: "#666" }}>
                   Preview of the cloned HTML and CSS
                 </span>
                 <button
                   onClick={updatePreview}
                   style={{
                     padding: "4px 8px",
                     fontSize: 12,
                     background: "#28a745",
                     color: "#fff",
                     border: "none",
                     borderRadius: 3,
                     cursor: "pointer",
                   }}
                 >
                   Refresh Preview
                 </button>
               </div>
            </>
          ) : (
            <div style={{ color: "#888" }}>No preview available yet.</div>
          )}
        </div>

        {/* Cloned Code */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #0001", padding: 16, maxHeight: 500, overflow: "auto" }}>
          <h3>Cloned Site Code</h3>
          {siteHtml || siteCss ? (
            <div>
              {siteHtml && (
                <div style={{ marginBottom: 12 }}>
                  <strong>HTML ({siteHtml.length} chars)</strong>
                  <pre style={{ fontSize: 11, background: "#f4f4f4", padding: 8, borderRadius: 4, whiteSpace: "pre-wrap", maxHeight: 150, overflow: "auto" }}>
                    {siteHtml.substring(0, 1000)}{siteHtml.length > 1000 ? '...' : ''}
                  </pre>
                </div>
              )}
              {siteCss && (
                <div style={{ marginBottom: 12 }}>
                  <strong>CSS ({siteCss.length} chars)</strong>
                  <pre style={{ fontSize: 11, background: "#f4f4f4", padding: 8, borderRadius: 4, whiteSpace: "pre-wrap", maxHeight: 150, overflow: "auto" }}>
                    {siteCss.substring(0, 1000)}{siteCss.length > 1000 ? '...' : ''}
                  </pre>
                </div>
              )}
              {!siteHtml && !siteCss && (
                <div style={{ color: "#888", marginBottom: 12 }}>No code extracted yet.</div>
              )}
              {(siteHtml || siteCss) && (
                <button
                  onClick={handleDownloadClonedCode}
                  style={{
                    padding: "6px 16px",
                    fontSize: 14,
                    background: "#0070f3",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Download Complete Code
                </button>
              )}
              <a ref={codeRef} style={{ display: "none" }} />
            </div>
          ) : (
            <div style={{ color: "#888" }}>No code extracted yet.</div>
          )}
        </div>

        {/* Layout Summary */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px #0001", padding: 16, maxHeight: 500, overflow: "auto" }}>
          <h3>Layout Summary</h3>
          {result?.layout ? (
            <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(result.layout, null, 2)}
            </pre>
          ) : (
            <div style={{ color: "#888" }}>No layout extracted yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

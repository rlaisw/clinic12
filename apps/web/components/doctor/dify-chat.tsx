"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Bot, User, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DifyChatProps {
  appCode: string;
}

/** Strip the model's reasoning preamble ("thinking … response", <think>…</think>,
 *  bare "thinking" with no marker, …) and stray instruction echoes. The real
 *  answer starts after the LAST preamble marker; fall back to dropping leading
 *  prose lines when no marker exists. */
function cleanAnswer(text: string): string {
  let s = (text || "").trim();
let cut = -1;
  for (const m of ["response", "<|", "</thinking>"]) {
    const i = s.lastIndexOf(m);
    if (i >= 0) cut = Math.max(cut, i + m.length);
  }
  if (cut > 0) {
    s = s.slice(cut);
  } else if (/^\s*(thinking|reasoning)\b/i.test(s)) {
    // No marker: reasoning is prose; keep from the FIRST content-like line
    // forward, dropping leading reasoning lines.
    const lines = s.split("\n");
    let k = 0;
    while (k < lines.length) {
      const t = (lines[k] ?? "").trim();
      if (t === "") { k++; continue; }
      if (
        t.includes("\t") ||
        t.startsWith("|") ||
        t.startsWith("<table") ||
        /^\d{1,2}[.)]\s+[A-Z]/.test(t)
      ) break;
      k++;
    }
    s = lines.slice(k).join("\n");
  }
  return s
    .replace(/^\s*\u003C\|?thinking\|>[\s\S]*?\u003C\|/i, "") // <|thinking|> ... <|
    .replace(/\banswer the result in table format if possible\b/gi, "")
    .trim();
}

// ---- Minimal Markdown rendering for LLM answers (tables, bold, inline code).
// Everything else is HTML-escaped before it can reach the DOM.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderTableGrid(head: string[], bodyRows: string[][]): string {
  return (
    '<table class="md-table"><thead><tr>' +
      head.map((c) => `<th>${inlineMd(c)}</th>`).join("") +
      "</tr></thead><tbody>" +
      bodyRows
        .map(
          (r) => "<tr>" + r.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>"
        )
        .join("") +
      "</tbody></table>"
  );
}

function renderTable(rows: string[]): string {
  const cells = (r: string) =>
    r
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
  const head = cells(rows[0] ?? "");
  const bodyRows = rows
    .slice(2)
    .map(cells)
    .filter((r) => r.length === head.length && r.join("").trim() !== "");
  return renderTableGrid(head, bodyRows);
}

/** Parse a model-emitted <table>...</table> safely: cells are extracted as text
 *  and re-rendered through the escaped pipeline (never trust the LLM's HTML). */
function renderHtmlTable(html: string): string {
  const rows: string[][] = [];
  for (const tr of html.split(/\u003C\/tr\u003E/i)) {
    const cells = [...tr.matchAll(/\u003Ct[dh][^\u003E]*\u003E([\s\S]*?)\u003C\/t[dh]\u003E/gi)]
      .map((m) => (m[1] ?? "").replace(/\u003C[^\u003E]+\u003E/g, "").trim())
      .filter((c) => c !== "");
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return html.replace(/\u003C[^\u003E]+\u003E/g, "").trim();
  const head = rows[0] ?? [];
  return renderTableGrid(head, rows.slice(1));
}

/** Render the model's Markdown as safe HTML (mainly so | ... | tables display). */
function renderAnswer(text: string): string {
  const lines = String(text || "").split("\n");
  const out: string[] = [];
  let i = 0;
  // debug note: emitBlock/asGrid/collectBlock are declared per-iteration below
    // where `line` is in scope.

    while (i < lines.length) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();
      const collectBlock = (isInBlock: (l: string) => boolean) => {
        const block = [line];
        i++;
        while (i < lines.length && isInBlock(lines[i] ?? "")) {
          block.push(lines[i] ?? "");
          i++;
        }
        return block;
      };
      const asGrid = (block: string[]) => {
        const sep = block[0]?.includes("\t") ? "\t" : "|";
        const cells = (r: string) =>
          r
            .split(sep)
            .map((c) => c.replace(/\u003C[^\u003E]+\u003E/g, "").trim())
            .filter((c) => c !== "");
        const grid = block.map(cells).filter((r) => r.length > 0);
        const w = grid[0]?.length ?? 0;
        return grid.length >= 2 && w >= 2 && grid.every((r) => r.length === w)
          ? grid
          : null;
      };
      const emitBlock = (block: string[]) => {
        const grid = asGrid(block);
        if (grid) {
          out.push(renderTableGrid(grid[0] ?? [], grid.slice(1)));
        } else {
          block.forEach((l) => out.push(`<div class="ai-line">${inlineMd(l)}</div>`));
        }
      };
      if (
        trimmed.startsWith("<") &&
        /<table[\s\u003E]/i.test(trimmed)
      ) {
        const block = [line];
        i++;
        while (
          i < lines.length &&
          !/(\u003C\/table\u003E)/i.test(lines[i] ?? "")
        ) {
          block.push(lines[i] ?? "");
          i++;
        }
        if (i < lines.length) block.push(lines[i] ?? "");
        i++;
        out.push(renderHtmlTable(block.join("\n")));
        continue;
      }
      // GFM pipe table WITH a |---|---| separator row
      if (
        line.trim().includes("|") &&
        i + 1 < lines.length &&
        /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")
      ) {
        const table = [line, lines[i + 1] ?? ""];
        i += 2;
        while (
          i < lines.length &&
          (lines[i] ?? "").trim().startsWith("|") &&
          (lines[i] ?? "").trim().endsWith("|")
        ) {
          table.push(lines[i] ?? "");
          i++;
        }
        out.push(renderTable(table));
        continue;
      }
      // Tab-separated block (models sometimes emit these instead of pipes)
      if (line.includes("\t")) {
        emitBlock(collectBlock((l) => l.includes("\t")));
        continue;
      }
      // Pipe block without a separator row
      if (
        trimmed.startsWith("|") &&
        trimmed.endsWith("|") &&
        trimmed.split("|").length >= 4
      ) {
        emitBlock(
          collectBlock((l) => {
            const t = l.trim();
            return t.startsWith("|") && t.endsWith("|");
          })
        );
        continue;
      }
      out.push(`<div class="ai-line">${inlineMd(line)}</div>`);
      i++;
    }
    return out.join("");
  }

/**
 * Direct-API chat against Dify, bypassing Dify's web UI (which stalls in
 * browsers behind the reverse proxy). Talks to our frontend proxy, which
 * forwards /dify/api/* to Dify's API.
 */
export function DifyChat({ appCode }: DifyChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passportRef = useRef<string | null>(null);
  const conversationIdRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtain a webapp passport once, like Dify's own webapp does.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dify/api/passport", {
          headers: { "X-App-Code": appCode },
        });
        if (!res.ok) throw new Error(`passport failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) passportRef.current = data.access_token;
      } catch (e) {
        if (!cancelled) {
          setError(
            `Cannot reach the AI service: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setError(null);

    try {
      if (!passportRef.current) throw new Error("passport not ready yet");
      const res = await fetch("/dify/api/chat-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Code": appCode,
          "X-App-Passport": passportRef.current,
        },
        body: JSON.stringify({
          inputs: {},
          query: text,
          response_mode: "blocking",
          conversation_id: conversationIdRef.current,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Dify API error ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      const answer = cleanAnswer(data.answer || "");
      if (data.conversation_id) conversationIdRef.current = data.conversation_id;
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(
        `Sorry, the AI service failed: ${e instanceof Error ? e.message : String(e)}`
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, the service is temporarily unavailable. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, appCode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5" /> AI Chatbot
          {error && (
            <span className="flex items-center gap-1 text-xs font-normal text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[60vh] flex-col gap-3 overflow-y-auto rounded border bg-muted/30 p-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "whitespace-pre-wrap bg-primary text-primary-foreground" : "bg-background border"
                }`}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <div className="md-content" dangerouslySetInnerHTML={{ __html: renderAnswer(m.content) }} />
                )}
              </div>
              {m.role === "user" && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="mt-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Ask about the clinic, the patients, and other related matters."
            disabled={loading || !!error}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">{loading ? "…" : "Send"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
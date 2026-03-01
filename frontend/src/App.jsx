import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DotWaveBackground from "./components/DotWaveBackground";
import GraphCirclePanel from "./components/GraphCirclePanel";
import addIcon from "../assets/icons/add.svg";
import arrowUpIcon from "../assets/icons/arrow-up.svg";
import closeIcon from "../assets/icons/close.svg";
import downloadIcon from "../assets/icons/download.svg";
import dropdownIcon from "../assets/icons/dropdown.svg";
import waveformIcon from "../assets/icons/waveform.svg";
import plannerSystemPromptRaw from "../../planner-system-prompt.txt?raw";

const TITLE_TEXT = "Welcome to the Matrix.";
const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:'\",.<>?/`~";
const SCRAMBLE_DURATION_MS = 2000;
const SCRAMBLE_INTERVAL_MS = 40;
const SUBTITLE_REVEAL_DELAY_MS = 480;

const examplePrompts = [
  "Help me simulate the effect of a new bill I would like to introduce in the state of Illinois...",
  "Help me simulate the effect of decreased taxes in America...",
  "Help me simulate my freshman year of college friend group's eventual fallout...",
  "Help me simulate how asking out my crush would go...",
  "Help me simulate a seating arrangement for a wedding with 100 guests...",
];
const SHARED_PREFIX = "Help me simulate ";

const TYPING_SPEED_MS = 40;
const DELETING_SPEED_MS = 24;
const HOLD_AT_FULL_MS = 1500;
const HOLD_BETWEEN_PROMPTS_MS = 360;
const CHIP_REMOVE_ANIMATION_MS = 520;
const CHIP_REPOSITION_ANIMATION_MS = 620;
const CHAT_ENTER_TRANSITION_MS = 620;
const CHAT_INITIAL_MESSAGE_STAGGER_MS = 500;
const COMPOSER_DOCK_ANIMATION_MS = 680;
const ARTIFACT_MODAL_EXIT_MS = 220;
const THINKING_PLACEHOLDER_OPTIONS = [
  "Performing matrix multiplications...",
  "Determin(ant)ing...",
  "ad - bc = ...",
  "Grabbing attention...",
  "Convoluting..."
];
const EXA_SUCCESS_PLACEHOLDER_TEXT = "";
const EXA_FAILURE_PLACEHOLDER_TEXT = "Failed to search with Exa.";
const STREAM_REVEAL_MIN_CHARS = 2;
const STREAM_REVEAL_MAX_CHARS = 20;
const STREAM_REVEAL_RATIO = 0.24;
const GRAPH_PANEL_MIN_WIDTH = 280;
const GRAPH_PANEL_MAX_WIDTH = 1600;
const GRAPH_PANEL_MIN_MAIN_WIDTH = 460;
const GRAPH_PANEL_DEFAULT_WIDTH = (() => {
  const viewportWidth =
    typeof window !== "undefined"
      ? window.innerWidth || 0
      : GRAPH_PANEL_MAX_WIDTH + GRAPH_PANEL_MIN_MAIN_WIDTH;
  const maxWidth = Math.max(
    0,
    Math.min(GRAPH_PANEL_MAX_WIDTH, viewportWidth - GRAPH_PANEL_MIN_MAIN_WIDTH)
  );
  if (maxWidth <= 0) return 0;
  const minWidth = Math.min(GRAPH_PANEL_MIN_WIDTH, maxWidth);
  const targetWidth = Math.round(viewportWidth * 0.5);
  return Math.min(maxWidth, Math.max(minWidth, targetWidth));
})();
const DEFAULT_PLANNER_SYSTEM_PROMPT =
  "You are a simulation planner assistant. Use provided prompt + context files to draft planning assumptions and key demographic factors.";
const PLANNER_SYSTEM_PROMPT = (plannerSystemPromptRaw || "").trim() || DEFAULT_PLANNER_SYSTEM_PROMPT;
const CHAT_AUTO_SCROLL_THRESHOLD_PX = 40;
const DEFAULT_PLANNER_MODEL_ENDPOINT = "";
const DEFAULT_PLANNER_MODEL_ID = "deepseek-r1";
const DEFAULT_PLANNER_DEV_PROXY_PATH = "/api/planner/chat";
const DEFAULT_EXA_PROXY_PATH = "/api/exa/search";
const DEFAULT_SPEECH_LIVE_WS_PATH = "/api/speech/live";
const DEFAULT_SPEECH_STREAM_TIMESLICE_MS = 280;
const SPEECH_FINALIZE_GRACE_MS = 4500;
const DEFAULT_BROWSER_SPEECH_LANG = "en-US";
const DEFAULT_CONTEXT_MAX_TOTAL_CHARS = 26000;
const DEFAULT_CONTEXT_MAX_FILE_CHARS = 5000;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const PLANNER_MODEL_ENDPOINT = (
  import.meta.env.VITE_PLANNER_CONTEXT_ENDPOINT ||
  import.meta.env.VITE_PLANNER_MODEL_ENDPOINT ||
  DEFAULT_PLANNER_MODEL_ENDPOINT
).trim();
const PLANNER_MODEL_ID = (import.meta.env.VITE_PLANNER_MODEL_ID || DEFAULT_PLANNER_MODEL_ID).trim();
const PLANNER_API_KEY = (import.meta.env.VITE_PLANNER_API_KEY || "").trim();
const PLANNER_DEV_PROXY_PATH = (
  import.meta.env.VITE_PLANNER_PROXY_PATH || DEFAULT_PLANNER_DEV_PROXY_PATH
).trim();
const USE_PLANNER_DEV_PROXY =
  import.meta.env.DEV && import.meta.env.VITE_USE_PLANNER_PROXY !== "false";
const EXA_PROXY_PATH = (import.meta.env.VITE_EXA_PROXY_PATH || DEFAULT_EXA_PROXY_PATH).trim();
const SPEECH_LIVE_WS_PATH = (
  import.meta.env.VITE_SPEECH_LIVE_WS_PATH || DEFAULT_SPEECH_LIVE_WS_PATH
).trim();
const SPEECH_STREAM_TIMESLICE_MS = parsePositiveInt(
  import.meta.env.VITE_SPEECH_STREAM_TIMESLICE_MS,
  DEFAULT_SPEECH_STREAM_TIMESLICE_MS
);
const BROWSER_SPEECH_LANG =
  (import.meta.env.VITE_BROWSER_SPEECH_LANG || DEFAULT_BROWSER_SPEECH_LANG).trim() ||
  DEFAULT_BROWSER_SPEECH_LANG;
const PLANNER_CONTEXT_MAX_TOTAL_CHARS = parsePositiveInt(
  import.meta.env.VITE_PLANNER_CONTEXT_MAX_TOTAL_CHARS,
  DEFAULT_CONTEXT_MAX_TOTAL_CHARS
);
const PLANNER_CONTEXT_MAX_FILE_CHARS = parsePositiveInt(
  import.meta.env.VITE_PLANNER_CONTEXT_MAX_FILE_CHARS,
  DEFAULT_CONTEXT_MAX_FILE_CHARS
);
const TEXT_PREVIEW_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "log"
]);
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "doc",
  "docx",
  "rtf",
  "png",
  "jpg",
  "jpeg"
]);
const MAX_TOTAL_FILES = 200;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function pickThinkingPlaceholder() {
  const index = Math.floor(Math.random() * THINKING_PLACEHOLDER_OPTIONS.length);
  return THINKING_PLACEHOLDER_OPTIONS[index] || THINKING_PLACEHOLDER_OPTIONS[0];
}

function resolveThinkingPlaceholder(message) {
  const explicit = String(message?.thinkingPlaceholder || "").trim();
  if (explicit) return explicit;
  const content = String(message?.content || "").trim();
  if (THINKING_PLACEHOLDER_OPTIONS.includes(content)) return content;
  return THINKING_PLACEHOLDER_OPTIONS[0];
}

function isThinkingPlaceholderMessage(message) {
  if (!message?.pending) return false;
  const content = String(message?.content || "").trim();
  if (message?.uiType === "thinking-placeholder") {
    const placeholder = resolveThinkingPlaceholder(message);
    return !content || content === placeholder;
  }
  return THINKING_PLACEHOLDER_OPTIONS.includes(content);
}

function extensionFor(name) {
  const split = name.split(".");
  if (split.length <= 1) return "";
  return split.at(-1).toLowerCase();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isAllowedContextFile(file) {
  if (file.type === "image/png" || file.type === "image/jpeg") return true;
  if (file.type && file.type.startsWith("text/")) return true;
  return ALLOWED_EXTENSIONS.has(extensionFor(file.name));
}

function filePathForContext(file) {
  return file.webkitRelativePath || file.name;
}

function fileLabel(file) {
  const ext = extensionFor(file.name);
  if (ext) return ext.toUpperCase();
  if (file.type && file.type.startsWith("text/")) return "TEXT";
  return "FILE";
}

function fileNameFromPath(path) {
  const normalized = path.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return segments.at(-1) || path;
}

function createRuntimeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function plannerChatEndpointFor(baseOrEndpoint) {
  const trimmed = (baseOrEndpoint || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/v1/chat/completions")) return trimmed;
  return `${trimmed}/v1/chat/completions`;
}

function isTextContextFile(file) {
  const extension = extensionFor(file.name);
  return (file.type && file.type.startsWith("text/")) || TEXT_PREVIEW_EXTENSIONS.has(extension);
}

function parseInlineMarkdown(text, keyPrefix) {
  if (!text) return [""];

  const tokenRegex =
    /(`[^`\n]+`|\*\*[^*\n][\s\S]*?\*\*|~~[^~\n][\s\S]*?~~|\*[^*\n][\s\S]*?\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  const nodes = [];
  let cursor = 0;
  let tokenIndex = 0;
  let match = tokenRegex.exec(text);

  while (match) {
    const [rawToken] = match;
    const start = match.index;

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    if (rawToken.startsWith("**") && rawToken.endsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${tokenIndex}`}>
          {rawToken.slice(2, -2)}
        </strong>
      );
    } else if (rawToken.startsWith("~~") && rawToken.endsWith("~~")) {
      nodes.push(
        <del key={`${keyPrefix}-del-${tokenIndex}`}>
          {rawToken.slice(2, -2)}
        </del>
      );
    } else if (rawToken.startsWith("*") && rawToken.endsWith("*")) {
      nodes.push(
        <em key={`${keyPrefix}-em-${tokenIndex}`}>
          {rawToken.slice(1, -1)}
        </em>
      );
    } else if (rawToken.startsWith("`") && rawToken.endsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-code-${tokenIndex}`}>
          {rawToken.slice(1, -1)}
        </code>
      );
    } else if (rawToken.startsWith("[")) {
      const linkMatch = rawToken.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${tokenIndex}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(rawToken);
      }
    } else {
      nodes.push(rawToken);
    }

    cursor = start + rawToken.length;
    tokenIndex += 1;
    match = tokenRegex.exec(text);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function renderInlineWithBreaks(text, keyPrefix) {
  const lines = text.split("\n");
  const nodes = [];

  for (let i = 0; i < lines.length; i += 1) {
    nodes.push(...parseInlineMarkdown(lines[i], `${keyPrefix}-line-${i}`));
    if (i < lines.length - 1) {
      nodes.push(<br key={`${keyPrefix}-br-${i}`} />);
    }
  }

  return nodes;
}

function renderMarkdownBlocks(markdownText, keyPrefix) {
  const lines = String(markdownText || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const unorderedItemPattern = /^\s*[-*+•]\s+/;
  const orderedItemPattern = /^\s*\d+\.\s+/;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <pre key={`${keyPrefix}-pre-${blocks.length}`} className="md-pre">
          <code data-language={language || undefined}>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const HeadingTag = `h${level}`;
      blocks.push(
        <HeadingTag key={`${keyPrefix}-h-${blocks.length}`}>
          {renderInlineWithBreaks(headingText, `${keyPrefix}-h-${blocks.length}`)}
        </HeadingTag>
      );
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`${keyPrefix}-hr-${blocks.length}`} />);
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote key={`${keyPrefix}-quote-${blocks.length}`}>
          {renderInlineWithBreaks(quoteLines.join("\n"), `${keyPrefix}-quote-${blocks.length}`)}
        </blockquote>
      );
      continue;
    }

    if (unorderedItemPattern.test(line)) {
      const items = [];
      while (i < lines.length && unorderedItemPattern.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+•]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`${keyPrefix}-ul-${blocks.length}`}>
          {items.map((item, index) => (
            <li key={`${keyPrefix}-ul-item-${index}`}>
              {renderInlineWithBreaks(item, `${keyPrefix}-ul-item-${index}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (orderedItemPattern.test(line)) {
      const items = [];
      while (i < lines.length) {
        if (!orderedItemPattern.test(lines[i])) break;

        const item = {
          text: lines[i].replace(/^\s*\d+\.\s+/, ""),
          bullets: []
        };
        i += 1;

        while (i < lines.length && unorderedItemPattern.test(lines[i])) {
          item.bullets.push(lines[i].replace(/^\s*[-*+•]\s+/, ""));
          i += 1;
        }

        items.push(item);

        if (i < lines.length && !orderedItemPattern.test(lines[i])) {
          const lookaheadStart = i;
          let lookahead = lookaheadStart;
          while (lookahead < lines.length && !lines[lookahead].trim()) {
            lookahead += 1;
          }

          if (lookahead < lines.length && orderedItemPattern.test(lines[lookahead])) {
            i = lookahead;
            continue;
          }
        }
      }
      blocks.push(
        <ol key={`${keyPrefix}-ol-${blocks.length}`}>
          {items.map((item, index) => (
            <li key={`${keyPrefix}-ol-item-${index}`}>
              {renderInlineWithBreaks(item.text, `${keyPrefix}-ol-item-${index}`)}
              {item.bullets.length > 0 ? (
                <ul>
                  {item.bullets.map((bullet, bulletIndex) => (
                    <li key={`${keyPrefix}-ol-item-${index}-bullet-${bulletIndex}`}>
                      {renderInlineWithBreaks(
                        bullet,
                        `${keyPrefix}-ol-item-${index}-bullet-${bulletIndex}`
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines = [line];
    i += 1;
    while (i < lines.length) {
      const candidate = lines[i];
      const candidateTrimmed = candidate.trim();
      if (!candidateTrimmed) break;
      if (
        candidateTrimmed.startsWith("```") ||
        /^(#{1,6})\s+/.test(candidate) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(candidateTrimmed) ||
        /^\s*>\s?/.test(candidate) ||
        unorderedItemPattern.test(candidate) ||
        orderedItemPattern.test(candidate)
      ) {
        break;
      }
      paragraphLines.push(candidate);
      i += 1;
    }

    blocks.push(
      <p key={`${keyPrefix}-p-${blocks.length}`}>
        {renderInlineWithBreaks(paragraphLines.join("\n"), `${keyPrefix}-p-${blocks.length}`)}
      </p>
    );
  }

  return blocks;
}

function renderMarkdownContent(markdownText, keyPrefix) {
  const nodes = renderMarkdownBlocks(markdownText, keyPrefix);
  if (!nodes || (Array.isArray(nodes) && nodes.length === 0)) {
    return <p>{markdownText}</p>;
  }

  return nodes;
}

function splitAssistantThinkContent(rawText, assumeUnclosedIsThinking = false) {
  const normalized = String(rawText || "").replace(/\r\n/g, "\n");
  const withoutOpenTags = normalized.replace(/<think\s*>/gi, "");
  const closeMatch = /<\/think\s*>/i.exec(withoutOpenTags);

  if (closeMatch) {
    const thinkText = withoutOpenTags.slice(0, closeMatch.index).replace(/<\/think\s*>/gi, "");
    const answerText = withoutOpenTags
      .slice(closeMatch.index + closeMatch[0].length)
      .replace(/<\/think\s*>/gi, "");
    return {
      hasCloseTag: true,
      thinkText,
      answerText
    };
  }

  if (assumeUnclosedIsThinking) {
    return {
      hasCloseTag: false,
      thinkText: withoutOpenTags.replace(/<\/think\s*>/gi, ""),
      answerText: ""
    };
  }

  return {
    hasCloseTag: false,
    thinkText: "",
    answerText: withoutOpenTags.replace(/<\/think\s*>/gi, "")
  };
}

function stripThinkSections(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const closeTagRegex = /<\/think\s*>/gi;
  let lastCloseEnd = -1;
  let closeMatch = closeTagRegex.exec(normalized);
  while (closeMatch) {
    lastCloseEnd = closeTagRegex.lastIndex;
    closeMatch = closeTagRegex.exec(normalized);
  }

  const postThinkSection = lastCloseEnd !== -1 ? normalized.slice(lastCloseEnd) : normalized;
  const fullyClosedRemoved = postThinkSection.replace(/<think\s*>[\s\S]*?<\/think\s*>/gi, "");
  const trailingOpenThinkRemoved = fullyClosedRemoved.replace(/<think\s*>[\s\S]*$/gi, "");
  return trailingOpenThinkRemoved.replace(/<\/?think\s*>/gi, "").trim();
}

function looksLikeCsvLine(line) {
  const normalized = String(line || "").trim();
  return normalized.length > 0 && normalized.includes(",") && !normalized.startsWith("```");
}

function parseCsvLine(line) {
  const text = String(line || "");
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "\"") {
      if (inQuotes && text[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function normalizeCsvToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isRepeatedHeaderRow(values, normalizedHeaders) {
  if (!Array.isArray(values) || values.length < normalizedHeaders.length) return false;
  for (let i = 0; i < normalizedHeaders.length; i += 1) {
    if (normalizeCsvToken(values[i]) !== normalizedHeaders[i]) {
      return false;
    }
  }
  return true;
}

function alignCsvRowValues(values, headerCount) {
  if (!Array.isArray(values) || headerCount <= 0) return null;
  if (values.length === headerCount) return values;
  if (values.length > headerCount) {
    // Recover unquoted commas by collapsing overflow into the last column.
    return [
      ...values.slice(0, headerCount - 1),
      values.slice(headerCount - 1).join(",")
    ];
  }
  return [...values, ...Array(headerCount - values.length).fill("")];
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function serializeCsvRecords(headers, rows) {
  if (!Array.isArray(headers) || headers.length === 0) return "";
  const headerLine = headers.map((header) => escapeCsvValue(header)).join(",");
  const bodyLines = (rows || []).map((row) =>
    headers.map((header) => escapeCsvValue(row?.[header] ?? "")).join(",")
  );
  return [headerLine, ...bodyLines].join("\n").trim();
}

function extractCsvPayload(text) {
  const postThinkSection = stripThinkSections(text);
  if (!postThinkSection) return "";

  const trimmed = postThinkSection.trim();
  const fencedMatch = trimmed.match(/```(?:csv)?\s*\n([\s\S]*?)\n```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const lines = trimmed.split("\n");
  const requiredHeaderSignals = new Set(["run_id", "agent_id", "id", "connections", "system_prompt"]);

  const headerIndex = lines.findIndex((line) => {
    const candidate = line.trim();
    if (!candidate || !looksLikeCsvLine(candidate)) return false;

    const fields = parseCsvLine(candidate)
      .map((field) => field.trim().toLowerCase())
      .filter(Boolean);

    if (fields.length < 2) return false;
    return fields.some((field) => requiredHeaderSignals.has(field));
  });

  if (headerIndex !== -1) {
    const csvLines = [];

    for (let i = headerIndex; i < lines.length; i += 1) {
      const candidate = lines[i].trim();

      if (!candidate) {
        if (csvLines.length > 0) break;
        continue;
      }

      if (!looksLikeCsvLine(candidate)) {
        if (csvLines.length > 0) break;
        continue;
      }

      csvLines.push(candidate);
    }

    if (csvLines.length > 0) {
      return csvLines.join("\n").trim();
    }
  }

  return trimmed;
}

function parseCsvRecords(csvText) {
  const normalized = String(csvText || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return { headers: [], rows: [] };

  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (rawLines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(rawLines[0]).map((header) => header.trim());
  if (headers.length < 2) return { headers: [], rows: [] };
  const normalizedHeaders = headers.map((header) => normalizeCsvToken(header));
  const idHeader =
    headers.find((header) => normalizeCsvToken(header) === "agent_id") ||
    headers.find((header) => normalizeCsvToken(header) === "id") ||
    "";
  const seenAgentIds = new Set();
  const rows = [];

  for (let i = 1; i < rawLines.length; i += 1) {
    const parsedValues = parseCsvLine(rawLines[i]).map((value) => String(value ?? "").trim());
    const values = alignCsvRowValues(parsedValues, headers.length);
    if (!values || !values.some((value) => value.length > 0)) continue;
    if (isRepeatedHeaderRow(values, normalizedHeaders)) continue;

    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      const key = headers[j] || `column_${j}`;
      row[key] = String(values[j] || "").trim();
    }

    if (idHeader) {
      const rawAgentId = String(row[idHeader] || "").trim();
      if (!rawAgentId || normalizeCsvToken(rawAgentId) === normalizeCsvToken(idHeader)) {
        continue;
      }
      if (seenAgentIds.has(rawAgentId)) {
        continue;
      }
      seenAgentIds.add(rawAgentId);
    }

    rows.push(row);
  }

  return { headers, rows };
}

function splitConnectionTokens(rawValue) {
  return String(rawValue || "")
    .split(/[|,;]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildNetworkGraphFromCsv(csvText) {
  const { headers, rows } = parseCsvRecords(csvText);
  if (headers.length === 0 || rows.length === 0) return null;

  const findHeader = (name) =>
    headers.find((header) => header.trim().toLowerCase() === name.toLowerCase()) || "";

  const idColumn = findHeader("agent_id") || findHeader("id");
  if (!idColumn) return null;

  const connectionsColumn = findHeader("connections");
  const nodes = [];
  const nodeById = new Map();

  for (const row of rows) {
    const id = String(row[idColumn] || "").trim();
    if (!id || nodeById.has(id)) continue;
    const node = {
      id,
      label: row.full_name || row.name || id,
      metadata: row,
      connections: [],
      declared_connections: splitConnectionTokens(connectionsColumn ? row[connectionsColumn] : "")
    };
    nodes.push(node);
    nodeById.set(id, node);
  }

  const edges = [];
  const edgeSet = new Set();
  const warnings = [];

  for (const node of nodes) {
    const resolved = [];
    for (const target of node.declared_connections) {
      if (target === node.id) {
        warnings.push(`Self-connection ignored for ${node.id}.`);
        continue;
      }
      if (!nodeById.has(target)) {
        warnings.push(`Unresolved connection ${node.id} -> ${target}.`);
        continue;
      }
      resolved.push(target);
      const left = node.id < target ? node.id : target;
      const right = node.id < target ? target : node.id;
      const edgeKey = `${left}::${right}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);
      edges.push({ source: left, target: right });
    }
    node.connections = Array.from(new Set(resolved)).sort();
  }

  return {
    nodes,
    edges,
    stats: {
      node_count: nodes.length,
      edge_count: edges.length,
      unresolved_connection_count: warnings.length
    },
    warnings
  };
}

function summarizeCsvArtifact(csvText) {
  const payload = extractCsvPayload(csvText);
  if (!payload) return null;

  const { headers, rows } = parseCsvRecords(payload);
  if (headers.length === 0) return null;
  const normalizedPayload = serializeCsvRecords(headers, rows);
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());

  const headerCount = headers.length;
  const rowCount = rows.length;
  const graph = rowCount > 0 ? buildNetworkGraphFromCsv(normalizedPayload) : null;
  const runIdHeader =
    headers.find((header) => header.trim().toLowerCase() === "run_id") || "";
  const runId =
    runIdHeader && rowCount > 0 ? String(rows[0]?.[runIdHeader] || "").trim() : "";
  const hasAgentIdHeader = normalizedHeaders.includes("agent_id") || normalizedHeaders.includes("id");
  const hasConnectionsHeader = normalizedHeaders.includes("connections");
  const hasSystemPromptHeader = normalizedHeaders.includes("system_prompt");

  const isLikelyCsv =
    rowCount > 0 &&
    headerCount > 1 &&
    (hasAgentIdHeader || hasConnectionsHeader || hasSystemPromptHeader);

  if (!isLikelyCsv) return null;

  return {
    payload: normalizedPayload,
    headerCount,
    rowCount,
    runId,
    graph
  };
}

function buildCsvSummaryMessage(csvText) {
  const { headers, rows } = parseCsvRecords(csvText);
  if (!rows.length) return null;

  const n = rows.length;
  const lines = [`Here's a summary of the ${n} generated agent${n !== 1 ? "s" : ""}:`];

  // Connection stats
  if (headers.includes("connections")) {
    const counts = rows.map((row) => {
      const conns = (row["connections"] || "").trim();
      return conns ? conns.split(/[|;,]/).filter(Boolean).length : 0;
    });
    const avg = (counts.reduce((a, b) => a + b, 0) / n).toFixed(1);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    lines.push(`• Connections: avg ${avg} per agent (range ${min}–${max})`);
  }

  // Demographic fields
  const fields = [
    ["gender", "Gender"],
    ["ethnicity", "Ethnicity"],
    ["political_lean", "Political lean"],
    ["socioeconomic_status", "Socioeconomic status"],
    ["education", "Education"],
    ["occupation", "Occupation"],
  ];
  for (const [field, label] of fields) {
    if (!headers.includes(field)) continue;
    const tally = {};
    for (const row of rows) {
      const val = (row[field] || "").trim();
      if (val) tally[val] = (tally[val] || 0) + 1;
    }
    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (!entries.length) continue;
    lines.push(`• ${label}: ${entries.map(([v, c]) => `${v} (${c})`).join(", ")}`);
  }

  lines.push("\nWould you like to make any changes to the generated agents? Describe what you'd like to adjust, or say \"no changes\" to proceed.");
  return lines.join("\n");
}

function formatCsvDownloadFilename(runId = "") {
  const safeRunId = String(runId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = safeRunId || "planner-output";
  return `${prefix}-${stamp}.csv`;
}

const NUMBER_WORD_LOOKUP = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000
};

function parseWordNumberToken(input) {
  const normalized = String(input || "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .trim();
  if (!normalized) return null;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;

  for (const token of tokens) {
    const value = NUMBER_WORD_LOOKUP[token];
    if (!Number.isFinite(value)) return null;

    if (token === "hundred") {
      current = (current || 1) * 100;
      continue;
    }

    if (token === "thousand") {
      total += (current || 1) * 1000;
      current = 0;
      continue;
    }

    current += value;
  }

  const result = total + current;
  if (!Number.isFinite(result) || result <= 0) return null;
  return result;
}

function extractRequestedSampleCountFromPrompt(promptText) {
  const text = String(promptText || "");
  if (!text) return null;
  const sampleNounPattern =
    "(?:representatives?|agents?|samples?|residents?|citizens?|people|persons?|individuals?|voters?|households?|respondents?|personas?|profiles?)";

  const numericPatterns = [
    /\bn\s*=\s*([\d,]{1,9})\b/i,
    new RegExp(`\\bwith\\s+([\\d,]{1,9})\\s+${sampleNounPattern}\\b`, "i"),
    new RegExp(`\\b([\\d,]{1,9})\\s+${sampleNounPattern}\\b`, "i"),
    /\bsimulat(?:e|ion)\b[\s\S]{0,120}?\bwith\s+([\d,]{1,9})\b/i
  ];

  for (const pattern of numericPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const count = Number.parseInt(match[1].replaceAll(",", ""), 10);
    if (Number.isFinite(count) && count > 0) {
      return count;
    }
  }

  const wordPatterns = [
    new RegExp(`\\bwith\\s+([a-z]+(?:[-\\s][a-z]+){0,3})\\s+${sampleNounPattern}\\b`, "i"),
    new RegExp(`\\b([a-z]+(?:[-\\s][a-z]+){0,3})\\s+${sampleNounPattern}\\b`, "i"),
    /\bsimulat(?:e|ion)\b[\s\S]{0,120}?\bwith\s+([a-z]+(?:[-\s][a-z]+){0,3})\b/i
  ];

  for (const pattern of wordPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const count = parseWordNumberToken(match[1]);
    if (Number.isFinite(count) && count > 0) {
      return count;
    }
  }

  return null;
}

function parseCountToken(token) {
  const normalized = String(token || "").trim();
  if (!normalized) return null;
  const numeric = Number.parseInt(normalized.replaceAll(",", ""), 10);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return parseWordNumberToken(normalized);
}

function inferEditTargetSampleCount(currentCsvPayload, changeRequest) {
  const currentCount = parseCsvRecords(currentCsvPayload).rows.length;
  const text = String(changeRequest || "").trim();
  if (!text) return currentCount > 0 ? currentCount : null;
  const sampleNounPattern =
    "(?:representatives?|agents?|samples?|residents?|citizens?|people|persons?|individuals?|voters?|households?|respondents?|personas?|profiles?)";

  const absolutePatterns = [
    new RegExp(
      `\\b(?:set|make|update|change|do|use|keep|have)\\s+(?:it\\s+)?(?:to|at)?\\s*([a-z0-9,\\s-]{1,40})\\s+${sampleNounPattern}\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?:total(?:\\s+of)?|exactly|at)\\s+([a-z0-9,\\s-]{1,40})\\s+${sampleNounPattern}\\b`,
      "i"
    )
  ];

  for (const pattern of absolutePatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const parsed = parseCountToken(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const directRequestedCount = extractRequestedSampleCountFromPrompt(text);
  if (Number.isFinite(directRequestedCount) && directRequestedCount > 0) {
    const relativeVerbPattern = /\b(add|increase|expand|append|include|generate|remove|delete|drop|reduce|decrease|cut)\b/i;
    const relativeQualifierPattern = /\b(more|fewer|less)\b/i;
    if (!relativeVerbPattern.test(text) && !relativeQualifierPattern.test(text)) {
      return directRequestedCount;
    }
  }

  const addPatterns = [
    new RegExp(
      `\\b(?:add|increase|expand|append|include|generate)\\s+([a-z0-9,\\s-]{1,40})\\s+(?:more\\s+)?${sampleNounPattern}\\b`,
      "i"
    ),
    new RegExp(`\\b([a-z0-9,\\s-]{1,40})\\s+more\\s+${sampleNounPattern}\\b`, "i")
  ];
  for (const pattern of addPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const parsed = parseCountToken(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(1, currentCount + parsed);
    }
  }

  const removePatterns = [
    new RegExp(
      `\\b(?:remove|delete|drop|reduce|decrease|cut)\\s+([a-z0-9,\\s-]{1,40})\\s+${sampleNounPattern}\\b`,
      "i"
    ),
    new RegExp(`\\b([a-z0-9,\\s-]{1,40})\\s+fewer\\s+${sampleNounPattern}\\b`, "i"),
    /\bless\s+by\s+([a-z0-9,\s-]{1,40})\b/i
  ];
  for (const pattern of removePatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const parsed = parseCountToken(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(1, currentCount - parsed);
    }
  }

  // Fallback for vague edit prompts: keep previous total as expected target.
  return currentCount > 0 ? currentCount : null;
}

function downloadCsvArtifact(csvPayload, runId = "") {
  const normalized = String(csvPayload || "").trim();
  if (!normalized) return false;

  const blob = new Blob([normalized.endsWith("\n") ? normalized : `${normalized}\n`], {
    type: "text/csv;charset=utf-8"
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = formatCsvDownloadFilename(runId);
  anchor.rel = "noopener";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);

  return true;
}

function CsvArtifactCard({
  summary,
  pending = false,
  totalCount = null,
  previewText = "",
  onOpen = null,
  onDownload = null,
  downloadQueued = false
}) {
  const isInteractive = typeof onOpen === "function";
  const canDownload = typeof onDownload === "function";
  const downloadLabel = pending
    ? downloadQueued
      ? "Queued"
      : "Queue Download"
    : "Download CSV";

  return (
    <div className={`csv-artifact-card ${pending ? "pending" : ""}`}>
      <button
        type="button"
        className={`csv-artifact-main ${isInteractive ? "interactive" : ""}`}
        aria-label="Generated CSV artifact"
        onClick={() => {
          if (isInteractive) {
            onOpen();
          }
        }}
        disabled={!isInteractive}
      >
        <div className="csv-artifact-badge">CSV</div>
        <div className="csv-artifact-copy">
          <p className="csv-artifact-title">Generated Agent Data</p>
        </div>
      </button>
      <button
        type="button"
        className={`csv-artifact-download ${downloadQueued ? "queued" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          if (canDownload) {
            onDownload();
          }
        }}
        disabled={!canDownload}
        aria-label={downloadLabel}
        title={downloadLabel}
      >
        <img src={downloadIcon} alt="" />
      </button>
    </div>
  );
}

function CsvPreviewTable({ csvText }) {
  const { headers, rows } = parseCsvRecords(csvText);

  if (!headers.length) {
    return <p className="artifact-empty">Waiting for CSV content...</p>;
  }

  return (
    <div className="artifact-table-wrap">
      <table className="artifact-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`csv-header-${index}`}>{header || `column_${index + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={`csv-row-${rowIndex}`}>
                {headers.map((header, colIndex) => (
                  <td key={`csv-cell-${rowIndex}-${colIndex}`}>
                    {String(row[header] || "")}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="artifact-table-empty" colSpan={headers.length}>
                Waiting for CSV rows...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function isLikelyCsvDraft(text) {
  const payload = extractCsvPayload(text);
  if (!payload) return false;

  const lines = payload
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return false;

  const firstLine = lines[0];
  if (firstLine.startsWith("```csv")) return true;

  // Avoid misclassifying numbered clarifying questions with commas as CSV.
  if (/^\d+[\.\)]\s+/.test(firstLine)) return false;
  if (firstLine.includes("?")) return false;
  if (!looksLikeCsvLine(firstLine)) return false;

  const headerFields = parseCsvLine(firstLine).map((field) => field.trim().toLowerCase());
  if (headerFields.length < 2) return false;

  // Planner contract: these columns are always present in generated master CSVs.
  const hasRequiredHeaderSignal =
    headerFields.includes("agent_id") ||
    headerFields.includes("connections") ||
    headerFields.includes("system_prompt") ||
    headerFields.includes("run_id");

  return hasRequiredHeaderSignal;
}

function thoughtDurationLabel(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "Thought for a moment.";
  }

  if (durationSeconds < 10) {
    return `Thought for ${durationSeconds.toFixed(1)} seconds.`;
  }

  return `Thought for ${Math.round(durationSeconds)} seconds.`;
}

function ThinkDisclosure({ id, label, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));

  return (
    <div className={`chat-assistant-think-details ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="chat-assistant-think-summary"
        aria-expanded={isOpen}
        aria-controls={`${id}-think-panel`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img className="chat-assistant-think-caret" src={dropdownIcon} alt="" />
        <span>{label}</span>
      </button>
      <div className="chat-assistant-think-panel" id={`${id}-think-panel`} aria-hidden={!isOpen}>
        <div className="chat-assistant-think-body">{children}</div>
      </div>
    </div>
  );
}

function ThinkingStatusRow({ label }) {
  return (
    <div className="chat-meta-think chat-assistant-think-wrap">
      <div className="chat-assistant-think-summary static" role="status" aria-live="polite">
        <img className="chat-assistant-think-caret" src={dropdownIcon} alt="" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function domainFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function ExaStatusPill({ status }) {
  if (!status) return null;
  const isSearching = status === "searching";
  const results = typeof status === "object" ? status.results : null;
  if (!isSearching && !results?.length) return null;
  return (
    <div className="exa-fetched-wrap">
      {isSearching && (
        <div className="exa-fetched-searching">
          <span className="exa-fetched-label">exa</span>
          <span className="exa-pill-dots"><span /><span /><span /></span>
        </div>
      )}
      {results && results.map((r, i) => (
        <a key={i} className="exa-fetched-row" href={r.url} target="_blank" rel="noreferrer"
           style={{ animationDelay: `${i * 70}ms` }}>
          <span className="exa-fetched-text">Fetched: {r.title || domainFromUrl(r.url)}</span>
        </a>
      ))}
    </div>
  );
}

function renderMessageContent(message, options = {}) {
  const { onOpenArtifact, onQueueArtifactDownload, isArtifactDownloadQueued } = options;

  if (message.role !== "assistant") {
    return renderMarkdownContent(message.content, message.id);
  }

  const messageText = String(message.content || "");
  const thinkingPlaceholderText = resolveThinkingPlaceholder(message);
  if (message.uiType === "status-tooltip") {
    return (
      <div className="chat-meta-log">
        <p className="chat-status-tooltip">{messageText}</p>
      </div>
    );
  }

  const exaStatusBody =
    message.exaWebSearchSuccess || message.exaWebSearchError ? (
      <>
        {message.exaWebSearchSuccess ? (
          <p className="chat-exa-success-placeholder">{EXA_SUCCESS_PLACEHOLDER_TEXT}</p>
        ) : null}
        {message.exaWebSearchError ? (
          <>
            <p className="chat-exa-failure-placeholder">{EXA_FAILURE_PLACEHOLDER_TEXT}</p>
            <p className="chat-exa-failure-detail">{String(message.exaWebSearchError)}</p>
          </>
        ) : null}
      </>
    ) : null;
  const exaFetchedStatusBody = message.exaStatus ? <ExaStatusPill status={message.exaStatus} /> : null;
  const exaMetaBlock =
    exaFetchedStatusBody || exaStatusBody ? (
      <div className="chat-meta-exa">
        {exaFetchedStatusBody}
        {exaStatusBody}
      </div>
    ) : null;

  if (isThinkingPlaceholderMessage(message)) {
    return (
      <>
        {exaMetaBlock}
        <ThinkingStatusRow label={thinkingPlaceholderText} />
      </>
    );
  }

  const treatUnclosedAsThinking = Boolean(message.pending) || /<think\s*>/i.test(messageText);
  const { thinkText, answerText } = splitAssistantThinkContent(messageText, treatUnclosedAsThinking);
  const hasThinkText = thinkText.trim().length > 0;
  const hasAnswerText = answerText.trim().length > 0;
  const thinkLabel = message.pending
    ? thinkingPlaceholderText
    : thoughtDurationLabel(message.thinkingDurationSec);
  const primaryAnswerText = hasAnswerText ? answerText : messageText;
  const csvSummary = summarizeCsvArtifact(primaryAnswerText);
  const showCsvArtifact = Boolean(csvSummary) || isLikelyCsvDraft(primaryAnswerText);
  const isCsvPending = Boolean(message.pending) || !csvSummary;
  const artifactPreviewText = (csvSummary?.payload || extractCsvPayload(primaryAnswerText) || "").trim();
  const downloadQueued =
    typeof isArtifactDownloadQueued === "function" ? isArtifactDownloadQueued(message.id) : false;
  const requestedSampleCount =
    Number.isFinite(message.requestedSampleCount) && message.requestedSampleCount > 0
      ? message.requestedSampleCount
      : null;
  if (!hasThinkText) {
    if (showCsvArtifact) {
      return (
        <>
          {exaMetaBlock}
          <CsvArtifactCard
            summary={csvSummary}
            pending={isCsvPending}
            totalCount={requestedSampleCount}
            previewText={artifactPreviewText}
            onOpen={
              onOpenArtifact
                ? () => onOpenArtifact({ messageId: message.id, content: artifactPreviewText })
                : null
            }
            onDownload={
              onQueueArtifactDownload
                ? () =>
                    onQueueArtifactDownload({
                      messageId: message.id,
                      content: artifactPreviewText,
                      runId: csvSummary?.runId || "",
                      pending: isCsvPending
                    })
                : null
            }
            downloadQueued={downloadQueued}
          />
        </>
      );
    }
    return (
      <>
        {exaMetaBlock}
        {renderMarkdownContent(primaryAnswerText, message.id)}
      </>
    );
  }

  return (
    <>
      {exaMetaBlock}
      <div className="chat-meta-think chat-assistant-think-wrap">
        <ThinkDisclosure id={message.id} label={thinkLabel} defaultOpen={Boolean(message.pending)}>
          {renderMarkdownContent(thinkText, `${message.id}-think`)}
        </ThinkDisclosure>
      </div>
      {hasAnswerText && showCsvArtifact ? (
        <div className="chat-assistant-answer">
          <CsvArtifactCard
            summary={csvSummary}
            pending={isCsvPending}
            totalCount={requestedSampleCount}
            previewText={artifactPreviewText}
            onOpen={
              onOpenArtifact
                ? () => onOpenArtifact({ messageId: message.id, content: artifactPreviewText })
                : null
            }
            onDownload={
              onQueueArtifactDownload
                ? () =>
                    onQueueArtifactDownload({
                      messageId: message.id,
                      content: artifactPreviewText,
                      runId: csvSummary?.runId || "",
                      pending: isCsvPending
                    })
                : null
            }
            downloadQueued={downloadQueued}
          />
        </div>
      ) : null}
      {hasAnswerText && !showCsvArtifact ? (
        <div className="chat-assistant-answer">
          {renderMarkdownContent(answerText, `${message.id}-answer`)}
        </div>
      ) : null}
    </>
  );
}

function messageShouldRenderCsvArtifact(message) {
  if (!message || message.role !== "assistant") return false;
  if (message.uiType === "status-tooltip") return false;

  const messageText = String(message.content || "");
  if (isThinkingPlaceholderMessage(message)) {
    return false;
  }

  const treatUnclosedAsThinking = Boolean(message.pending) || /<think\s*>/i.test(messageText);
  const { answerText } = splitAssistantThinkContent(messageText, treatUnclosedAsThinking);
  const primaryAnswerText = answerText.trim() ? answerText : messageText;
  return Boolean(summarizeCsvArtifact(primaryAnswerText)) || isLikelyCsvDraft(primaryAnswerText);
}

function messageHasThinkSection(message) {
  if (!message || message.role !== "assistant") return false;
  if (message.uiType === "status-tooltip") return false;

  const messageText = String(message.content || "");
  if (isThinkingPlaceholderMessage(message)) {
    return true;
  }

  const treatUnclosedAsThinking = Boolean(message.pending) || /<think\s*>/i.test(messageText);
  const { thinkText } = splitAssistantThinkContent(messageText, treatUnclosedAsThinking);
  return thinkText.trim().length > 0;
}

function consumeSseDataEvents(buffer, onData) {
  let remaining = buffer;
  while (true) {
    const eventBoundary = remaining.indexOf("\n\n");
    if (eventBoundary === -1) break;

    const eventBlock = remaining.slice(0, eventBoundary);
    remaining = remaining.slice(eventBoundary + 2);

    const lines = eventBlock.split("\n");
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length > 0) {
      onData(dataLines.join("\n"));
    }
  }

  return remaining;
}

function extractStreamDelta(parsedEvent) {
  const choice = parsedEvent?.choices?.[0];
  if (!choice) return "";
  if (typeof choice?.delta?.content === "string") return choice.delta.content;
  if (typeof choice?.text === "string") return choice.text;
  return "";
}

async function readPlannerResponseStream(response, onPartial) {
  if (!response.body) {
    throw new Error("Planner endpoint returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let aggregatedText = "";

  const consumeEventPayload = (payload) => {
    if (!payload || payload === "[DONE]") return;

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }

    const contentDelta = extractStreamDelta(parsed);
    if (contentDelta) {
      aggregatedText += contentDelta;
      onPartial(aggregatedText);
      return;
    }

    const fullContent = parsed?.choices?.[0]?.message?.content;
    if (typeof fullContent === "string") {
      aggregatedText = fullContent;
      onPartial(aggregatedText);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    buffer = consumeSseDataEvents(buffer, consumeEventPayload);
  }

  const tail = decoder.decode().replace(/\r\n/g, "\n");
  if (tail) {
    buffer += tail;
  }
  if (buffer) {
    buffer = consumeSseDataEvents(buffer, consumeEventPayload);
  }

  return aggregatedText.trim();
}

async function buildPlannerContextBlock(files) {
  if (files.length === 0) return "No external context files attached.";

  let remainingChars = PLANNER_CONTEXT_MAX_TOTAL_CHARS;
  const sections = [];

  for (const { path, file } of files) {
    const descriptor = `${path} (${fileLabel(file)}, ${formatBytes(file.size)})`;

    if (!isTextContextFile(file)) {
      sections.push(
        `File: ${descriptor}\nContent: [Binary or non-text file attached; not inlined by browser client.]`
      );
      continue;
    }

    if (remainingChars <= 0) {
      sections.push(`File: ${descriptor}\nContent: [Omitted due to context size budget.]`);
      continue;
    }

    try {
      const rawText = await file.text();
      const normalized = rawText.replace(/\r\n/g, "\n");
      const allowedChars = Math.min(PLANNER_CONTEXT_MAX_FILE_CHARS, remainingChars);
      const excerpt = normalized.slice(0, allowedChars);
      remainingChars -= excerpt.length;
      const truncatedSuffix = normalized.length > excerpt.length ? "\n...[truncated]" : "";
      sections.push(`File: ${descriptor}\nContent:\n\`\`\`\n${excerpt}${truncatedSuffix}\n\`\`\``);
    } catch (error) {
      sections.push(`File: ${descriptor}\nContent: [Failed to read file in browser.]`);
    }
  }

  return sections.join("\n\n");
}

// ── Clarifying questions ────────────────────────────────────────────────────

const CLARIFY_TIMEOUT_MS = 25000;
const CLARIFY_MAX_QUESTIONS = 6;
const FORCE_GENERATION_REPLY_PATTERN =
  /\b(go\s*ahead|proceed|continue|as\s*is|use\s*defaults?|skip\s*(follow[- ]?ups?|questions?)|no\s*more\s*questions?|don'?t\s*ask\s*more|do\s*not\s*ask\s*more)\b/i;

function isForceGenerationReply(text) {
  return FORCE_GENERATION_REPLY_PATTERN.test(String(text || "").trim());
}

function extractClarifyingQuestionLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+[\.\)]\s+\S/.test(line));
}

function limitClarifyingQuestions(lines, maxQuestions = CLARIFY_MAX_QUESTIONS) {
  return lines
    .slice(0, maxQuestions)
    .map((line, index) => line.replace(/^\d+[\.\)]\s+/, `${index + 1}. `));
}

// ── Exa search ──────────────────────────────────────────────────────────────

async function runExaSearch(query, stage = "main") {
  try {
    const resp = await fetch(EXA_PROXY_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        type: "auto",
        num_results: 5,
        contents: { highlights: { max_characters: 800 } }
      })
    });

    if (!resp.ok) {
      let detail = "";
      try {
        detail = await resp.text();
      } catch {
        detail = "";
      }
      const errorMessage = `Exa proxy returned ${resp.status}${detail ? `: ${detail.slice(0, 220)}` : ""}`;
      console.error(`[Exa:${stage}] ${errorMessage}`);
      return { data: null, error: errorMessage };
    }

    const data = await resp.json();
    if (!Array.isArray(data?.results)) {
      const errorMessage = "Exa response missing results array.";
      console.error(`[Exa:${stage}] ${errorMessage}`, data);
      return { data: null, error: errorMessage };
    }

    return { data, error: "" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Exa request error.";
    console.error(`[Exa:${stage}] request failed: ${errorMessage}`);
    return { data: null, error: errorMessage };
  }
}

function formatExaContext(exaData) {
  if (!exaData?.results?.length) return "";
  const snippets = exaData.results.map((r, i) => {
    const title = r.title || r.url || `Source ${i + 1}`;
    const highlight = r.highlights?.[0]?.text || r.highlights?.[0] || "";
    return `[${i + 1}] ${title}\n${highlight}`;
  });
  return `\n\n[Web research via Exa — ${exaData.results.length} sources]\n${snippets.join("\n\n")}`;
}

function buildCensusQuery(prompt) {
  return `census demographics population statistics survey data ${prompt}`;
}

function formatCensusExaContext(exaData) {
  if (!exaData?.results?.length) return "";
  const snippets = exaData.results.map((r, i) => {
    const title = r.title || r.url || `Source ${i + 1}`;
    const highlight = r.highlights?.[0]?.text || r.highlights?.[0] || "";
    return `[${i + 1}] ${title}\n${highlight}`;
  });
  return `\n\n[Census & demographic data via Exa — ${exaData.results.length} sources]\n${snippets.join("\n\n")}`;
}

function App() {
  const [displayTitle, setDisplayTitle] = useState(TITLE_TEXT);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [scenarioText, setScenarioText] = useState("");
  const [contextFiles, setContextFiles] = useState([]);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewMode, setPreviewMode] = useState("none");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [artifactModal, setArtifactModal] = useState(null);
  const [isArtifactModalClosing, setIsArtifactModalClosing] = useState(false);
  const [queuedArtifactDownloadIds, setQueuedArtifactDownloadIds] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingSpeech, setIsRecordingSpeech] = useState(false);
  const [isTranscribingSpeech, setIsTranscribingSpeech] = useState(false);
  const [isSpeechDrivenInput, setIsSpeechDrivenInput] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [isHeroCompacted, setIsHeroCompacted] = useState(false);
  const [isGraphPanelOpen, setIsGraphPanelOpen] = useState(false);
  const [graphPanelGraph, setGraphPanelGraph] = useState(null);
  const [graphPanelWidth, setGraphPanelWidth] = useState(GRAPH_PANEL_DEFAULT_WIDTH);
  const [isGraphPanelResizing, setIsGraphPanelResizing] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [simulationReport, setSimulationReport] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState(null);
  const simulationPollRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [placeholderText, setPlaceholderText] = useState(
    examplePrompts[0].startsWith(SHARED_PREFIX) ? SHARED_PREFIX : ""
  );
  const [isPlaceholderTypingActive, setIsPlaceholderTypingActive] = useState(true);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingContextIds, setRemovingContextIds] = useState(() => new Set());
  const [clarifyState, setClarifyState] = useState(null);
  const [editState, setEditState] = useState(null);
  const fileInputRef = useRef(null);
  const composerInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const speechChunksRef = useRef([]);
  const speechSocketRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const speechPrefixTextRef = useRef("");
  const speechFinalizeTimerRef = useRef(0);
  const speechUpdatesEnabledRef = useRef(false);
  const scenarioTextRef = useRef(scenarioText);
  const chatScrollRef = useRef(null);
  const composerShellRef = useRef(null);
  const heroCopyRef = useRef(null);
  const contextFilesRef = useRef(contextFiles);
  const removeTimersRef = useRef(new Map());
  const artifactModalCloseTimerRef = useRef(0);
  const contextChipRefs = useRef(new Map());
  const previousChipPositionsRef = useRef(new Map());
  const composerStartRectRef = useRef(null);
  const wasHeroCompactedRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const graphPanelResizeRef = useRef({
    active: false,
    startX: 0,
    startWidth: GRAPH_PANEL_DEFAULT_WIDTH
  });

  useEffect(() => {
    contextFilesRef.current = contextFiles;
  }, [contextFiles]);

  useEffect(() => {
    scenarioTextRef.current = scenarioText;
  }, [scenarioText]);

  useEffect(() => {
    if (!scenarioText.trim()) {
      setIsSpeechDrivenInput(false);
    }
  }, [scenarioText]);

  const isChatActive = isChatMode;
  const composerPlaceholder = isChatActive ? "Start typing here..." : placeholderText;
  const clampGraphPanelWidth = (candidateWidth) => {
    const viewportWidth = window.innerWidth || GRAPH_PANEL_MAX_WIDTH + GRAPH_PANEL_MIN_MAIN_WIDTH;
    const maxWidth = Math.max(0, Math.min(GRAPH_PANEL_MAX_WIDTH, viewportWidth - GRAPH_PANEL_MIN_MAIN_WIDTH));
    if (maxWidth <= 0) return 0;
    const minWidth = Math.min(GRAPH_PANEL_MIN_WIDTH, maxWidth);
    return Math.min(maxWidth, Math.max(minWidth, Math.round(candidateWidth)));
  };

  const updateAutoScrollLock = () => {
    const chatNode = chatScrollRef.current;
    if (!chatNode) return;

    const distanceFromBottom =
      chatNode.scrollHeight - (chatNode.scrollTop + chatNode.clientHeight);
    shouldAutoScrollRef.current = distanceFromBottom <= CHAT_AUTO_SCROLL_THRESHOLD_PX;
  };

  const scrollChatToBottom = (behavior = "smooth", forceLock = false) => {
    const chatNode = chatScrollRef.current;
    if (!chatNode) return;
    if (forceLock) {
      shouldAutoScrollRef.current = true;
    }
    chatNode.scrollTo({
      top: chatNode.scrollHeight,
      behavior
    });
  };

  const handleChatThreadScroll = () => {
    updateAutoScrollLock();
  };

  useEffect(() => {
    if (!isChatMode) {
      setIsHeroCompacted(false);
      return undefined;
    }

    const heroCopyNode = heroCopyRef.current;
    if (!heroCopyNode) {
      setIsHeroCompacted(true);
      return undefined;
    }

    const handleTransitionEnd = (event) => {
      if (event.target !== heroCopyNode || event.propertyName !== "opacity") return;
      setIsHeroCompacted(true);
    };

    heroCopyNode.addEventListener("transitionend", handleTransitionEnd);

    return () => {
      heroCopyNode.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [isChatMode]);

  useLayoutEffect(() => {
    const enteringDockedLayout = isHeroCompacted && !wasHeroCompactedRef.current;
    if (!enteringDockedLayout) {
      wasHeroCompactedRef.current = isHeroCompacted;
      return;
    }

    const shellNode = composerShellRef.current;
    const startRect = composerStartRectRef.current;
    if (!shellNode || !startRect) {
      wasHeroCompactedRef.current = isHeroCompacted;
      return;
    }

    const endRect = shellNode.getBoundingClientRect();
    const deltaX = startRect.left - endRect.left;
    const deltaY = startRect.top - endRect.top;

    shellNode.animate(
      [
        { transform: `translate(-50%, 0) translate(${deltaX}px, ${deltaY}px)` },
        { transform: "translate(-50%, 0) translate(0, 0)" }
      ],
      {
        duration: COMPOSER_DOCK_ANIMATION_MS,
        easing: "cubic-bezier(0.68, -0.38, 0.22, 1.28)",
        fill: "both"
      }
    );

    composerStartRectRef.current = null;
    wasHeroCompactedRef.current = isHeroCompacted;
  }, [isHeroCompacted]);

  useEffect(() => {
    if (!isChatActive || !isHeroCompacted || !shouldAutoScrollRef.current) return;
    const scrollToBottom = () => {
      if (!shouldAutoScrollRef.current) return;
      scrollChatToBottom("auto");
    };
    let delayedRafId = 0;
    const rafId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(() => {
      delayedRafId = window.requestAnimationFrame(scrollToBottom);
    }, 120);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (delayedRafId) {
        window.cancelAnimationFrame(delayedRafId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [chatMessages, isChatActive, isHeroCompacted]);

  useEffect(() => {
    if (!isChatActive || !isHeroCompacted) return;
    shouldAutoScrollRef.current = true;
    const rafId = window.requestAnimationFrame(() => {
      scrollChatToBottom("auto", true);
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isChatActive, isHeroCompacted]);

  useLayoutEffect(() => {
    const chipNodes = contextChipRefs.current;
    const previousPositions = previousChipPositionsRef.current;
    const nextPositions = new Map();

    chipNodes.forEach((node, id) => {
      nextPositions.set(id, {
        left: node.offsetLeft,
        top: node.offsetTop
      });
    });

    chipNodes.forEach((node, id) => {
      if (node.classList.contains("removing")) return;

      const previousRect = previousPositions.get(id);
      const nextRect = nextPositions.get(id);
      if (!previousRect || !nextRect) return;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

      node.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" }
        ],
        {
          duration: CHIP_REPOSITION_ANIMATION_MS,
          easing: "cubic-bezier(0.26, 1.18, 0.4, 1)",
          fill: "none"
        }
      );
    });

    previousChipPositionsRef.current = nextPositions;
  }, [contextFiles]);

  useEffect(() => {
    return () => {
      removeTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      removeTimersRef.current.clear();
      if (artifactModalCloseTimerRef.current) {
        window.clearTimeout(artifactModalCloseTimerRef.current);
        artifactModalCloseTimerRef.current = 0;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (speechSocketRef.current) {
        speechSocketRef.current.close();
        speechSocketRef.current = null;
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // no-op
        }
        speechRecognitionRef.current = null;
      }
      if (speechFinalizeTimerRef.current) {
        window.clearTimeout(speechFinalizeTimerRef.current);
        speechFinalizeTimerRef.current = 0;
      }
    };
  }, []);

  const appendSpeechErrorMessage = (errorText) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: createRuntimeId("assistant"),
        role: "assistant",
        content: `Speech-to-text failed: ${errorText}`,
        uiType: "status-tooltip",
        error: true
      }
    ]);
  };

  const resolveSpeechLiveWebSocketUrl = () => {
    const configured = String(SPEECH_LIVE_WS_PATH || "").trim();
    if (/^wss?:\/\//i.test(configured)) return configured;
    const base = window.location.origin.replace(/^http/i, "ws");
    const path = configured.startsWith("/") ? configured : `/${configured}`;
    return `${base}${path}`;
  };

  const openSpeechLiveSocket = () =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(resolveSpeechLiveWebSocketUrl());
      ws.binaryType = "arraybuffer";

      const timeoutId = window.setTimeout(() => {
        ws.close();
        reject(new Error("Timed out connecting to live speech endpoint."));
      }, 5000);

      ws.onopen = () => {
        window.clearTimeout(timeoutId);
        resolve(ws);
      };
      ws.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Failed to connect to live speech endpoint."));
      };
    });

  const preferredRecorderMimeType = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return "";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "";
  };

  const startBrowserInterimRecognition = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = BROWSER_SPEECH_LANG;

      let finalText = "";
      recognition.onresult = (event) => {
        if (!speechUpdatesEnabledRef.current) return;
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = String(result?.[0]?.transcript || "").trim();
          if (!transcript) continue;
          if (result.isFinal) {
            finalText = [finalText, transcript].filter(Boolean).join(" ").trim();
          } else {
            interimText = [interimText, transcript].filter(Boolean).join(" ").trim();
          }
        }
        const spoken = [finalText, interimText].filter(Boolean).join(" ").trim();
        if (!spoken) return;
        const prefix = speechPrefixTextRef.current;
        const combined = [prefix, spoken].filter(Boolean).join(" ").trim();
        setIsSpeechDrivenInput(true);
        scenarioTextRef.current = combined;
        setScenarioText(combined);
        window.requestAnimationFrame(() => {
          const input = composerInputRef.current;
          if (!input) return;
          const end = combined.length;
          input.setSelectionRange(end, end);
          input.scrollLeft = input.scrollWidth;
        });
      };
      recognition.onerror = () => {
        // Fallback silently to whisper live stream only.
      };
      recognition.onend = () => {
        speechRecognitionRef.current = null;
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {
      // Fallback silently to whisper live stream only.
    }
  };

  const closeSpeechResources = () => {
    speechUpdatesEnabledRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (speechSocketRef.current) {
      try {
        speechSocketRef.current.close();
      } catch {
        // no-op
      }
      speechSocketRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // no-op
      }
      speechRecognitionRef.current = null;
    }
    if (speechFinalizeTimerRef.current) {
      window.clearTimeout(speechFinalizeTimerRef.current);
      speechFinalizeTimerRef.current = 0;
    }
    mediaRecorderRef.current = null;
    speechChunksRef.current = [];
  };

  const stopSpeechCapture = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setIsRecordingSpeech(false);
  };

  const startSpeechCapture = async () => {
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      appendSpeechErrorMessage("Your browser does not support microphone recording.");
      return;
    }

    if (isSubmitting || isTranscribingSpeech) return;

    setIsTranscribingSpeech(true);

    let ws;
    try {
      ws = await openSpeechLiveSocket();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to live speech endpoint.";
      appendSpeechErrorMessage(message);
      setIsTranscribingSpeech(false);
      return;
    }
    speechSocketRef.current = ws;
    speechPrefixTextRef.current = scenarioTextRef.current.trim();
    speechUpdatesEnabledRef.current = true;
    startBrowserInterimRecognition();

    ws.onmessage = (event) => {
      if (!speechUpdatesEnabledRef.current) return;
      try {
        const parsed = JSON.parse(String(event.data || "{}"));
        if (parsed?.type === "error") {
          appendSpeechErrorMessage(String(parsed.error || "Live speech endpoint error."));
          closeSpeechResources();
          setIsRecordingSpeech(false);
          setIsTranscribingSpeech(false);
          return;
        }
        const liveText = String(parsed?.text || "").trim();
        const prefix = speechPrefixTextRef.current;
        const combined = [prefix, liveText].filter(Boolean).join(" ").trim();
        if (liveText) {
          setIsSpeechDrivenInput(true);
        }
        if (parsed?.type === "final" || combined.length >= scenarioTextRef.current.length) {
          scenarioTextRef.current = combined;
          setScenarioText(combined);
          window.requestAnimationFrame(() => {
            const input = composerInputRef.current;
            if (!input) return;
            const end = combined.length;
            input.setSelectionRange(end, end);
            input.scrollLeft = input.scrollWidth;
          });
        }

        if (parsed?.type === "final") {
          closeSpeechResources();
          setIsRecordingSpeech(false);
          setIsTranscribingSpeech(false);
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onerror = () => {
      appendSpeechErrorMessage("Live speech socket error.");
      closeSpeechResources();
      setIsRecordingSpeech(false);
      setIsTranscribingSpeech(false);
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microphone permission was denied.";
      appendSpeechErrorMessage(message);
      closeSpeechResources();
      setIsTranscribingSpeech(false);
      return;
    }

    mediaStreamRef.current = stream;
    speechChunksRef.current = [];
    const mimeType = preferredRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "config",
          mime_type: recorder.mimeType || mimeType || "audio/webm"
        })
      );
    }

    recorder.addEventListener("dataavailable", async (event) => {
      if (!event.data || event.data.size === 0) return;
      speechChunksRef.current.push(event.data);
      const socket = speechSocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      try {
        const mimeType = recorder.mimeType || "audio/webm";
        const snapshotBlob = new Blob(speechChunksRef.current, { type: mimeType });
        const bytes = await snapshotBlob.arrayBuffer();
        socket.send(bytes);
      } catch {
        appendSpeechErrorMessage("Failed to stream audio chunk.");
      }
    });

    recorder.addEventListener("stop", async () => {
      setIsTranscribingSpeech(true);
      try {
        const socket = speechSocketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send("finalize");
        }
      } catch {
        // no-op
      } finally {
        speechFinalizeTimerRef.current = window.setTimeout(() => {
          closeSpeechResources();
          setIsTranscribingSpeech(false);
        }, SPEECH_FINALIZE_GRACE_MS);
      }
    });

    recorder.start(SPEECH_STREAM_TIMESLICE_MS);
    setIsRecordingSpeech(true);
    setIsTranscribingSpeech(false);
  };

  const handleSpeechButtonClick = () => {
    if (isRecordingSpeech) {
      stopSpeechCapture();
      return;
    }
    void startSpeechCapture();
  };

  const isSystemPrompting = chatMessages.some(
    (message) => message.role === "assistant" && message.pending
  );

  useEffect(() => {
    if (!isRecordingSpeech) return undefined;

    const handleEnterWhileRecording = (event) => {
      if (event.key !== "Enter") return;
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.isComposing) return;
      event.preventDefault();
      if (isSubmitting) return;
      composerShellRef.current?.requestSubmit?.();
    };

    window.addEventListener("keydown", handleEnterWhileRecording);
    return () => {
      window.removeEventListener("keydown", handleEnterWhileRecording);
    };
  }, [isRecordingSpeech, isSubmitting]);

  useEffect(() => {
    const handleResize = () => {
      setGraphPanelWidth((previous) => clampGraphPanelWidth(previous));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!graphPanelResizeRef.current.active) return;
      const deltaX = event.clientX - graphPanelResizeRef.current.startX;
      const nextWidth = clampGraphPanelWidth(graphPanelResizeRef.current.startWidth + deltaX);
      setGraphPanelWidth(nextWidth);
    };

    const handlePointerStop = () => {
      if (!graphPanelResizeRef.current.active) return;
      graphPanelResizeRef.current.active = false;
      setIsGraphPanelResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerStop);
    window.addEventListener("pointercancel", handlePointerStop);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerStop);
      window.removeEventListener("pointercancel", handlePointerStop);
    };
  }, []);

  const prepareCsvForSimulation = async (csvPayload) => {
    const normalizedCsv = String(csvPayload || "").trim();
    if (!normalizedCsv) {
      return { ok: false, error: "No generated CSV is available to save before simulation." };
    }
    try {
      const response = await fetch("/api/agents/generated-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: normalizedCsv })
      });
      if (!response.ok) {
        const detail = await response.text();
        return {
          ok: false,
          error: `CSV save/script pipeline failed (${response.status}): ${detail}`
        };
      }
      await response.json();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown CSV preparation error"
      };
    }
  };

  const handleRunSimulation = async (graphOverride = null, stimulusOverride = "") => {
    if (simulationStatus?.state === "running") {
      return { started: false, error: "Simulation is already running." };
    }

    const graphPayload =
      graphOverride && Array.isArray(graphOverride.nodes) && graphOverride.nodes.length > 0
        ? graphOverride
        : graphPanelGraph;

    if (!graphPayload || !Array.isArray(graphPayload.nodes) || graphPayload.nodes.length === 0) {
      const errorText = "No graph data available to start simulation.";
      setSimulationStatus({ state: "error", progress: 0, total: 0, day: 0, error: errorText });
      return { started: false, error: errorText };
    }
    const simulationStimulus = String(stimulusOverride || "").trim();
    if (!simulationStimulus) {
      const errorText = "Simulation stimulus is required.";
      setSimulationStatus({ state: "error", progress: 0, total: 0, day: 0, error: errorText });
      return { started: false, error: errorText };
    }

    setSimulationData(null);
    setSimulationReport({ state: "pending" });
    setSimulationStatus({ state: "running", progress: 0, total: 0, day: 0 });

    try {
      const startResponse = await fetch("/api/simulation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: graphPayload.nodes,
          edges: Array.isArray(graphPayload.edges) ? graphPayload.edges : [],
          stimulus: simulationStimulus,
        }),
      });

      let startBody = null;
      try {
        startBody = await startResponse.json();
      } catch {
        startBody = null;
      }

      if (!startResponse.ok) {
        const detail =
          startBody?.detail || startBody?.error || `API returned ${startResponse.status}.`;
        throw new Error(String(detail));
      }
    } catch (error) {
      const errorText = error?.message || "Network error";
      setSimulationStatus({ state: "error", progress: 0, total: 0, day: 0, error: errorText });
      return { started: false, error: errorText };
    }

    if (simulationPollRef.current) clearInterval(simulationPollRef.current);
    simulationPollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/simulation/status");
        const status = await res.json();
        setSimulationStatus(status);
        if (status.state === "done") {
          clearInterval(simulationPollRef.current);
          simulationPollRef.current = null;
          const [resultsResponse, reportResponse] = await Promise.all([
            fetch("/api/simulation/results"),
            fetch("/api/simulation/report/file?format=tex")
          ]);
          if (resultsResponse.ok) {
            setSimulationData(await resultsResponse.json());
          }
          if (reportResponse.ok) {
            const reportPayload = await reportResponse.json();
            setSimulationReport({ state: "ready", ...reportPayload });
          } else {
            let detail = "";
            try {
              const errorPayload = await reportResponse.json();
              detail = String(errorPayload?.detail || errorPayload?.error || "").trim();
            } catch {
              detail = "";
            }
            setSimulationReport({
              state: "error",
              error: detail || `Could not load report (${reportResponse.status}).`
            });
          }
        } else if (status.state === "error") {
          clearInterval(simulationPollRef.current);
          simulationPollRef.current = null;
          setSimulationReport(null);
        }
      } catch { /* keep polling */ }
    }, 2000);

    return { started: true, error: "" };
  };

  useEffect(() => {
    return () => { if (simulationPollRef.current) clearInterval(simulationPollRef.current); };
  }, []);

  const handleGraphPanelResizeStart = (event) => {
    if (!isGraphPanelOpen || event.button !== 0) return;
    event.preventDefault();
    graphPanelResizeRef.current = {
      active: true,
      startX: event.clientX,
      startWidth: graphPanelWidth
    };
    setIsGraphPanelResizing(true);
  };

  const handleGraphPanelResizeKeyDown = (event) => {
    if (!isGraphPanelOpen) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 18 : -18;
    setGraphPanelWidth((previous) => clampGraphPanelWidth(previous + delta));
  };

  useEffect(() => {
    if (!previewTarget) {
      setPreviewMode("none");
      setPreviewUrl("");
      setPreviewText("");
      setPreviewError("");
      return undefined;
    }

    const file = previewTarget.file;
    const extension = extensionFor(file.name);
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || extension === "pdf";
    const isText = file.type.startsWith("text/") || TEXT_PREVIEW_EXTENSIONS.has(extension);

    let objectUrl = "";
    let cancelled = false;

    const loadPreview = async () => {
      setPreviewError("");
      setPreviewText("");

      if (isImage) {
        objectUrl = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewUrl(objectUrl);
        setPreviewMode("image");
        return;
      }

      if (isPdf) {
        objectUrl = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewUrl(objectUrl);
        setPreviewMode("pdf");
        return;
      }

      if (isText) {
        setPreviewMode("text-loading");
        try {
          const content = await file.text();
          if (cancelled) return;
          setPreviewText(content);
          setPreviewMode("text");
        } catch (error) {
          if (cancelled) return;
          setPreviewMode("unsupported");
          setPreviewError("Could not render a text preview for this file.");
        }
        return;
      }

      objectUrl = URL.createObjectURL(file);
      if (cancelled) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setPreviewUrl(objectUrl);
      setPreviewMode("unsupported");
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewTarget]);

  useEffect(() => {
    if (!previewTarget) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPreviewTarget(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [previewTarget]);

  const closeArtifactModalWithAnimation = () => {
    if (!artifactModal || isArtifactModalClosing) return;
    setIsArtifactModalClosing(true);
    if (artifactModalCloseTimerRef.current) {
      window.clearTimeout(artifactModalCloseTimerRef.current);
    }
    artifactModalCloseTimerRef.current = window.setTimeout(() => {
      setArtifactModal(null);
      setIsArtifactModalClosing(false);
      artifactModalCloseTimerRef.current = 0;
    }, ARTIFACT_MODAL_EXIT_MS);
  };

  useEffect(() => {
    if (!artifactModal) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeArtifactModalWithAnimation();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [artifactModal, isArtifactModalClosing]);

  const handleOpenArtifactModal = ({ messageId, content }) => {
    if (artifactModalCloseTimerRef.current) {
      window.clearTimeout(artifactModalCloseTimerRef.current);
      artifactModalCloseTimerRef.current = 0;
    }
    setIsArtifactModalClosing(false);
    const normalized = String(content || "").trim();
    setArtifactModal({
      messageId: messageId || "",
      content: normalized
    });
  };

  const isArtifactDownloadQueued = (messageId) => queuedArtifactDownloadIds.has(messageId);

  const handleQueueArtifactDownload = ({ messageId, content, runId = "", pending = false }) => {
    const payload = String(content || "").trim();
    if (!messageId) return;

    if (!pending && payload) {
      downloadCsvArtifact(payload, runId);
      return;
    }

    setQueuedArtifactDownloadIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  };

  useEffect(() => {
    if (queuedArtifactDownloadIds.size === 0) return;

    const completed = [];

    queuedArtifactDownloadIds.forEach((messageId) => {
      const currentMessage = chatMessages.find(
        (message) => message.id === messageId && message.role === "assistant"
      );
      if (!currentMessage) return;

      const messageText = String(currentMessage.content || "");
      const treatUnclosedAsThinking =
        Boolean(currentMessage.pending) || /<think\s*>/i.test(messageText);
      const { answerText } = splitAssistantThinkContent(messageText, treatUnclosedAsThinking);
      const primaryAnswerText = answerText.trim() ? answerText : messageText;
      const summary = summarizeCsvArtifact(primaryAnswerText);

      if (currentMessage.pending || !summary?.payload) return;

      const didDownload = downloadCsvArtifact(summary.payload, summary.runId || messageId);
      if (didDownload) {
        completed.push(messageId);
      }
    });

    if (completed.length === 0) return;

    setQueuedArtifactDownloadIds((prev) => {
      const next = new Set(prev);
      completed.forEach((messageId) => next.delete(messageId));
      return next;
    });
  }, [chatMessages, queuedArtifactDownloadIds]);

  useEffect(() => {
    if (!artifactModal?.messageId) return;

    const currentMessage = chatMessages.find((message) => message.id === artifactModal.messageId);
    if (!currentMessage || currentMessage.role !== "assistant") return;

    const messageText = String(currentMessage.content || "");
    const treatUnclosedAsThinking =
      Boolean(currentMessage.pending) || /<think\s*>/i.test(messageText);
    const { answerText } = splitAssistantThinkContent(messageText, treatUnclosedAsThinking);
    const primaryAnswerText = answerText.trim() ? answerText : messageText;
    const latestPreview = (
      summarizeCsvArtifact(primaryAnswerText)?.payload || extractCsvPayload(primaryAnswerText) || ""
    ).trim();

    if (!latestPreview || latestPreview === artifactModal.content) return;

    setArtifactModal((prev) => {
      if (!prev || prev.messageId !== artifactModal.messageId) return prev;
      return {
        ...prev,
        content: latestPreview
      };
    });
  }, [chatMessages, artifactModal]);

  useEffect(() => {
    setShowSubtitle(false);
    const titleChars = TITLE_TEXT.split("");
    const shuffledIndices = titleChars.map((_, index) => index);
    for (let i = shuffledIndices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    const resolvedIndices = new Set();
    const totalTicks = Math.max(1, Math.round(SCRAMBLE_DURATION_MS / SCRAMBLE_INTERVAL_MS));
    let tick = 0;
    let subtitleDelayTimer;

    const randomChar = () =>
      SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];

    const buildScrambledTitle = () =>
      titleChars
        .map((char, index) => (resolvedIndices.has(index) ? char : randomChar()))
        .join("");

    setDisplayTitle(buildScrambledTitle());

    const timer = window.setInterval(() => {
      tick += 1;

      const targetResolvedCount = Math.min(
        titleChars.length,
        Math.floor((tick / totalTicks) * titleChars.length)
      );

      for (let i = resolvedIndices.size; i < targetResolvedCount; i += 1) {
        resolvedIndices.add(shuffledIndices[i]);
      }

      setDisplayTitle(buildScrambledTitle());

      if (tick >= totalTicks) {
        window.clearInterval(timer);
        setDisplayTitle(TITLE_TEXT);
        subtitleDelayTimer = window.setTimeout(() => {
          setShowSubtitle(true);
        }, SUBTITLE_REVEAL_DELAY_MS);
      }
    }, SCRAMBLE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      if (subtitleDelayTimer) {
        window.clearTimeout(subtitleDelayTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaceholderTypingActive) return undefined;

    const currentPrompt = examplePrompts[promptIndex];
    const retainedPrefixLength = currentPrompt.startsWith(SHARED_PREFIX) ? SHARED_PREFIX.length : 0;
    let delay = isDeleting ? DELETING_SPEED_MS : TYPING_SPEED_MS;

    if (!isDeleting && placeholderText === currentPrompt) {
      delay = HOLD_AT_FULL_MS;
    } else if (isDeleting && placeholderText.length <= retainedPrefixLength) {
      delay = HOLD_BETWEEN_PROMPTS_MS;
    }

    const timer = window.setTimeout(() => {
      if (!isDeleting) {
        if (placeholderText === currentPrompt) {
          setIsDeleting(true);
          return;
        }

        setPlaceholderText(currentPrompt.slice(0, placeholderText.length + 1));
        return;
      }

      if (placeholderText.length <= retainedPrefixLength) {
        setIsDeleting(false);
        setPromptIndex((prev) => (prev + 1) % examplePrompts.length);
        return;
      }

      setPlaceholderText(currentPrompt.slice(0, placeholderText.length - 1));
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isDeleting, placeholderText, promptIndex, isPlaceholderTypingActive]);

  const addContextFiles = (files) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const previousFiles = contextFilesRef.current;
    const accepted = [];
    const rejected = [];
    let duplicateCount = 0;
    const existingKeys = new Set(
      previousFiles.map(({ file, path }) => `${path}::${file.size}::${file.lastModified}`)
    );

    for (const file of incoming) {
      const path = filePathForContext(file);
      const key = `${path}::${file.size}::${file.lastModified}`;

      if (existingKeys.has(key)) {
        duplicateCount += 1;
        continue;
      }

      if (!isAllowedContextFile(file)) {
        rejected.push(`${path} (unsupported type)`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${path} (>${formatBytes(MAX_FILE_SIZE_BYTES)})`);
        continue;
      }

      accepted.push({
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : key,
        file,
        path
      });
      existingKeys.add(key);
    }

    const availableSlots = Math.max(0, MAX_TOTAL_FILES - previousFiles.length);
    if (accepted.length > availableSlots) {
      const overflow = accepted.splice(availableSlots);
      for (const dropped of overflow) {
        rejected.push(`${dropped.path} (too many files)`);
      }
    }

    const nextFiles = [...previousFiles, ...accepted];
    contextFilesRef.current = nextFiles;
    setContextFiles(nextFiles);
  };

  const handleFilePickerChange = (event) => {
    addContextFiles(event.target.files);
    event.target.value = "";
  };

  const handleRemoveContextFile = (fileId) => {
    if (removeTimersRef.current.has(fileId)) return;

    setRemovingContextIds((prev) => {
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });

    const timerId = window.setTimeout(() => {
      removeTimersRef.current.delete(fileId);
      setRemovingContextIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      setContextFiles((prev) => {
        const nextFiles = prev.filter((file) => file.id !== fileId);
        contextFilesRef.current = nextFiles;
        return nextFiles;
      });
      setPreviewTarget((current) => (current?.id === fileId ? null : current));
    }, CHIP_REMOVE_ANIMATION_MS);

    removeTimersRef.current.set(fileId, timerId);
  };

  const streamPlannerReplyIntoMessage = async ({
    requestUrl,
    payload,
    assistantTurnId,
    timeoutMs = 0
  }) => {
    const controller = new AbortController();
    const timerId =
      timeoutMs > 0
        ? window.setTimeout(() => {
            controller.abort();
          }, timeoutMs)
        : 0;

    let response;
    try {
      response = await fetch(requestUrl, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(!USE_PLANNER_DEV_PROXY && PLANNER_API_KEY
            ? { Authorization: `Bearer ${PLANNER_API_KEY}` }
            : {})
        },
        body: JSON.stringify(payload)
      });
    } finally {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    }

    if (!response.ok) {
      let detail = "";
      try { detail = await response.text(); } catch { detail = ""; }
      throw new Error(`Planner endpoint responded ${response.status}${detail ? `: ${detail.slice(0, 220)}` : ""}`);
    }

    const responseContentType = response.headers.get("content-type") || "";
    let assistantText = "";

    if (responseContentType.includes("text/event-stream")) {
      let targetText = "";
      let displayedText = "";
      let streamDone = false;
      let revealRafId = 0;
      let revealResolved = false;
      let resolveRevealCompletion;
      const revealCompletion = new Promise((resolve) => {
        resolveRevealCompletion = resolve;
      });

      const emitPartial = () => {
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantTurnId
              ? {
                  ...msg,
                  content: displayedText || msg.thinkingPlaceholder || THINKING_PLACEHOLDER_OPTIONS[0],
                  pending: true
                }
              : msg
          )
        );
      };

      const resolveIfComplete = () => {
        if (!streamDone) return;
        if (displayedText.length < targetText.length) return;
        if (revealResolved) return;
        revealResolved = true;
        resolveRevealCompletion();
      };

      const revealStep = () => {
        revealRafId = 0;
        if (displayedText.length < targetText.length) {
          const remaining = targetText.length - displayedText.length;
          const step = Math.min(
            STREAM_REVEAL_MAX_CHARS,
            Math.max(STREAM_REVEAL_MIN_CHARS, Math.ceil(remaining * STREAM_REVEAL_RATIO))
          );
          displayedText = targetText.slice(0, displayedText.length + step);
          emitPartial();
          revealRafId = window.requestAnimationFrame(revealStep);
          return;
        }
        resolveIfComplete();
      };

      const scheduleReveal = () => {
        if (revealRafId) return;
        revealRafId = window.requestAnimationFrame(revealStep);
      };

      try {
        assistantText = await readPlannerResponseStream(response, (partialText) => {
          targetText = partialText || "";
          if (targetText.length < displayedText.length) {
            displayedText = targetText;
            emitPartial();
          }
          scheduleReveal();
        });

        targetText = assistantText || targetText;
        streamDone = true;
        scheduleReveal();
        await revealCompletion;
      } finally {
        if (revealRafId) {
          window.cancelAnimationFrame(revealRafId);
          revealRafId = 0;
        }
      }
    } else {
      const plannerResponse = await response.json();
      assistantText = plannerResponse?.choices?.[0]?.message?.content || "";
    }

    if (!assistantText) {
      throw new Error("Planner endpoint returned no completion content.");
    }

    const completionTimeMs = Date.now();
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantTurnId
          ? {
              ...msg,
              content: assistantText,
              pending: false,
              thinkingDurationSec: Math.max(
                0.1,
                (completionTimeMs - (typeof msg.startedAtMs === "number" ? msg.startedAtMs : completionTimeMs)) / 1000
              )
            }
          : msg
      )
    );

    if (shouldAutoScrollRef.current) {
      window.requestAnimationFrame(() => scrollChatToBottom("auto"));
    }

    return assistantText;
  };

  const runMainQuery = async (enrichedPrompt, filesForSubmit, assistantPendingTurnId) => {
    const plannerContext = await buildPlannerContextBlock(filesForSubmit);
    const plannerEndpoint = plannerChatEndpointFor(PLANNER_MODEL_ENDPOINT);
    const plannerRequestUrl = USE_PLANNER_DEV_PROXY ? PLANNER_DEV_PROXY_PATH : plannerEndpoint;
    if (!plannerRequestUrl) throw new Error("Planner endpoint is not configured.");

    // Exa search runs before planner completion for retrieval context
    const exaResult = await runExaSearch(enrichedPrompt, "generation");
    const exaData = exaResult.data;
    const exaSearchSucceeded = Boolean(exaData?.results?.length);
    if (exaSearchSucceeded || exaResult.error) {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPendingTurnId
            ? {
                ...msg,
                exaWebSearchSuccess: exaSearchSucceeded,
                exaWebSearchError: exaResult.error ? String(exaResult.error) : ""
              }
            : msg
        )
      );
    }
    const exaContext = formatExaContext(exaData);

    const payload = {
      model: PLANNER_MODEL_ID,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Simulation request:\n${enrichedPrompt}\n\n` +
            `Attached context (${filesForSubmit.length} file(s)):\n${plannerContext}` +
            exaContext
        }
      ]
    };
    const plannerText = await streamPlannerReplyIntoMessage({
      requestUrl: plannerRequestUrl,
      payload,
      assistantTurnId: assistantPendingTurnId
    });

    const csvPayload = extractCsvPayload(plannerText);
    if (!csvPayload) return;
    const { rows: csvRows, headers: csvHeaders } = parseCsvRecords(csvPayload);
    const sampleCount = csvRows.length;
    const derivedGraph = buildNetworkGraphFromCsv(csvPayload);
    setGraphPanelGraph(derivedGraph && Array.isArray(derivedGraph.nodes) ? derivedGraph : null);
    setChatMessages((prev) => [
      ...prev,
      {
        id: createRuntimeId("assistant"),
        role: "assistant",
        content: `Generated ${sampleCount} samples.\nPlugging into the Matrix...`,
        uiType: "status-tooltip"
      }
    ]);

    window.setTimeout(() => {
      setIsGraphPanelOpen(true);
    }, 220);

    const summaryMessage = buildCsvSummaryMessage(csvPayload);
    if (summaryMessage) {
      const csvRunId = csvHeaders.includes("run_id") ? String(csvRows[0]?.["run_id"] || "") : "";
      setChatMessages((prev) => [
        ...prev,
        { id: createRuntimeId("assistant"), role: "assistant", content: summaryMessage }
      ]);
      setEditState({ csvPayload, runId: csvRunId, simulationStimulus: enrichedPrompt });
    }

    if (shouldAutoScrollRef.current) {
      window.requestAnimationFrame(() => scrollChatToBottom("auto"));
    }
  };

  const runEditQuery = async (
    currentCsvPayload,
    changeRequest,
    assistantTurnId
  ) => {
    const plannerEndpoint = plannerChatEndpointFor(PLANNER_MODEL_ENDPOINT);
    const plannerRequestUrl = USE_PLANNER_DEV_PROXY ? PLANNER_DEV_PROXY_PATH : plannerEndpoint;
    if (!plannerRequestUrl) throw new Error("Planner endpoint is not configured.");

    const editSystemPrompt =
      PLANNER_SYSTEM_PROMPT +
      "\n\nEDIT MODE: You are modifying an existing agent CSV based on a change request.\n" +
      "- Apply the requested changes to the CSV.\n" +
      "- Return the COMPLETE updated CSV (all rows, including unchanged ones).\n" +
      "- Keep the same column schema as the input.\n" +
      "- Only modify what the change request specifies.";

    const payload = {
      model: PLANNER_MODEL_ID,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: editSystemPrompt },
        {
          role: "user",
          content: `Here is the current agent CSV:\n\n${currentCsvPayload}\n\nModification request: ${changeRequest}`
        }
      ]
    };

    const plannerText = await streamPlannerReplyIntoMessage({
      requestUrl: plannerRequestUrl,
      payload,
      assistantTurnId
    });

    const csvPayload = extractCsvPayload(plannerText);
    if (!csvPayload) return;
    const { rows: csvRows, headers: csvHeaders } = parseCsvRecords(csvPayload);
    const sampleCount = csvRows.length;
    const derivedGraph = buildNetworkGraphFromCsv(csvPayload);
    setGraphPanelGraph(derivedGraph && Array.isArray(derivedGraph.nodes) ? derivedGraph : null);
    setChatMessages((prev) => [
      ...prev,
      {
        id: createRuntimeId("assistant"),
        role: "assistant",
        content: `Updated to ${sampleCount} agent${sampleCount !== 1 ? "s" : ""}.\nPlugging into the Matrix...`,
        uiType: "status-tooltip"
      }
    ]);

    const summaryMessage = buildCsvSummaryMessage(csvPayload);
    if (summaryMessage) {
      const csvRunId = csvHeaders.includes("run_id") ? String(csvRows[0]?.["run_id"] || "") : "";
      setChatMessages((prev) => [
        ...prev,
        { id: createRuntimeId("assistant"), role: "assistant", content: summaryMessage }
      ]);
      setEditState({
        csvPayload,
        runId: csvRunId,
        simulationStimulus: editState?.simulationStimulus || ""
      });
    }

    if (shouldAutoScrollRef.current) {
      window.requestAnimationFrame(() => scrollChatToBottom("auto"));
    }
  };

  const handleComposerSubmit = async (event) => {
    event.preventDefault();
    const promptText = scenarioTextRef.current.trim();
    const filesForSubmit = contextFiles.filter((file) => !removingContextIds.has(file.id));

    if (!promptText && filesForSubmit.length === 0) {
      if (!isRecordingSpeech && !isTranscribingSpeech) {
        void startSpeechCapture();
      }
      return;
    }

    // Once we send, fully stop listening/capture immediately.
    if (isRecordingSpeech || isTranscribingSpeech) {
      closeSpeechResources();
      setIsRecordingSpeech(false);
      setIsTranscribingSpeech(false);
    }

    // Clear composer immediately after any non-empty send attempt.
    setScenarioText("");
    scenarioTextRef.current = "";
    setIsSpeechDrivenInput(false);

    // If we're waiting for edit feedback after CSV generation
    if (editState) {
      if (!promptText) return;
      const userTurn = { id: createRuntimeId("user"), role: "user", content: promptText };
      const noChangesPattern = /^(no|no changes?|looks? good|proceed|continue(?: as is)?|go ahead|start(?: simulation)?|done|fine|ok(ay)?|that'?s? (good|fine|great|perfect)|all good|perfect|nope|nah|as is|whatever)\b/i;
      if (noChangesPattern.test(promptText.trim())) {
        const { csvPayload: currentCsv } = editState;
        const simulationGraph = buildNetworkGraphFromCsv(currentCsv) || graphPanelGraph;
        setEditState(null);
        setScenarioText("");
        setIsSubmitting(true);
        setChatMessages((prev) => [
          ...prev,
          userTurn
        ]);
        if (shouldAutoScrollRef.current) {
          window.requestAnimationFrame(() => scrollChatToBottom("smooth", true));
        }
        const csvPrepPromise = prepareCsvForSimulation(currentCsv);
        const simulationStart = await handleRunSimulation(
          simulationGraph,
          editState?.simulationStimulus || promptText
        );
        const csvPrep = await csvPrepPromise;
        scenarioTextRef.current = "";
        setChatMessages((prev) => [
          ...prev,
          {
            id: createRuntimeId("assistant"),
            role: "assistant",
            content: simulationStart.started
              ? "Simulation started. Welcome to the desert of the real."
              : `Couldn't start simulation:\n${simulationStart.error || "Unknown error."}`,
            uiType: "status-tooltip"
          }
        ]);
        if (!csvPrep.ok) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: createRuntimeId("assistant"),
              role: "assistant",
              content: `Simulation is running, but CSV asset pipeline failed:\n${csvPrep.error}`,
              uiType: "status-tooltip",
              error: true
            }
          ]);
        }
        setIsSubmitting(false);
        return;
      }

      // If the prompt looks like a brand-new simulation request, exit edit mode
      // and let the normal flow handle it (avoids sending old CSV + new scenario to model)
      const wordCount = promptText.trim().split(/\s+/).length;
      const containsSimulateKeyword = /\bsimulate\b|\bsimulation\b|\bhelp me\b/i.test(promptText);
      const isNewSimulation = wordCount > 25 || containsSimulateKeyword;
      if (isNewSimulation) {
        setEditState(null);
        // Fall through to normal submit flow below
      } else {
        const assistantPendingTurnId = createRuntimeId("assistant");
        const { csvPayload: currentCsv } = editState;
        const editThinkingPlaceholder = pickThinkingPlaceholder();
        const requestedSampleCount = inferEditTargetSampleCount(currentCsv, promptText);
        setEditState(null);
        setScenarioText("");
        scenarioTextRef.current = "";
        setIsSubmitting(true);
        setChatMessages((prev) => [
          ...prev,
          userTurn,
          {
            id: assistantPendingTurnId,
            role: "assistant",
            content: editThinkingPlaceholder,
            pending: true,
            uiType: "thinking-placeholder",
            thinkingPlaceholder: editThinkingPlaceholder,
            startedAtMs: Date.now(),
            requestedSampleCount
          }
        ]);
        window.requestAnimationFrame(() => scrollChatToBottom("smooth", true));

        try {
          await runEditQuery(currentCsv, promptText, assistantPendingTurnId);
        } catch (error) {
          const failureTimeMs = Date.now();
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantPendingTurnId
                ? { ...msg, content: `Edit request failed: ${error.message || "Unknown error."}`, pending: false, error: true, thinkingDurationSec: Math.max(0.1, (failureTimeMs - (typeof msg.startedAtMs === "number" ? msg.startedAtMs : failureTimeMs)) / 1000) }
                : msg
            )
          );
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
    }

    // If we're waiting for clarification answers, treat this as the user's reply
    if (clarifyState) {
      if (!promptText) return;
      const { originalPrompt, filesForSubmit, followUpQuestionCount = 0 } = clarifyState;
      const shouldForceGenerateNow =
        followUpQuestionCount >= CLARIFY_MAX_QUESTIONS || isForceGenerationReply(promptText);
      const enrichedPrompt = shouldForceGenerateNow
        ? `${originalPrompt}\n\nUser instruction: Proceed now with reasonable assumptions and generate the data. Do not ask additional follow-up questions.`
        : `${originalPrompt}\n\nUser's clarifications: ${promptText}`;
      const requestedSampleCount = extractRequestedSampleCountFromPrompt(enrichedPrompt);

      const userTurn = { id: createRuntimeId("user"), role: "user", content: promptText };
      const assistantPendingTurnId = createRuntimeId("assistant");
      const thinkingPlaceholder = pickThinkingPlaceholder();

      setClarifyState(null);
      setScenarioText("");
      scenarioTextRef.current = "";
      setIsSubmitting(true);
      setChatMessages((prev) => [
        ...prev,
        userTurn,
        {
          id: assistantPendingTurnId,
          role: "assistant",
          content: thinkingPlaceholder,
          pending: true,
          uiType: "thinking-placeholder",
          thinkingPlaceholder,
          startedAtMs: Date.now(),
          requestedSampleCount
        }
      ]);
      window.requestAnimationFrame(() => scrollChatToBottom("smooth", true));

      try {
        await runMainQuery(enrichedPrompt, filesForSubmit, assistantPendingTurnId);
      } catch (error) {
        const failureTimeMs = Date.now();
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPendingTurnId
              ? { ...msg, content: `Planner request failed: ${error.message || "Unknown error."}`, pending: false, error: true, thinkingDurationSec: Math.max(0.1, (failureTimeMs - (typeof msg.startedAtMs === "number" ? msg.startedAtMs : failureTimeMs)) / 1000) }
              : msg
          )
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isPlaceholderTypingActive) {
      setIsPlaceholderTypingActive(false);
      setPlaceholderText(SHARED_PREFIX);
    }

    setIsSubmitting(true);

    try {
      const isFirstChatSubmit = !isChatMode;
      if (isFirstChatSubmit) {
        if (composerShellRef.current) {
          composerStartRectRef.current = composerShellRef.current.getBoundingClientRect();
        }
        setIsChatMode(true);
        await new Promise((resolve) => window.setTimeout(resolve, CHAT_ENTER_TRANSITION_MS));
        await new Promise((resolve) => window.setTimeout(resolve, CHAT_INITIAL_MESSAGE_STAGGER_MS));
      }

      const userTurn = { id: createRuntimeId("user"), role: "user", content: promptText || "[No prompt provided]" };
      const clarifyMsgId = createRuntimeId("assistant");
      const clarifyThinkingPlaceholder = pickThinkingPlaceholder();
      const requestedSampleCount = extractRequestedSampleCountFromPrompt(promptText);

      setChatMessages((prev) => [
        ...prev,
        userTurn,
        {
          id: clarifyMsgId,
          role: "assistant",
          content: clarifyThinkingPlaceholder,
          pending: true,
          uiType: "thinking-placeholder",
          thinkingPlaceholder: clarifyThinkingPlaceholder,
          exaStatus: "searching"
        }
      ]);
      setScenarioText("");
      scenarioTextRef.current = "";
      window.requestAnimationFrame(() => scrollChatToBottom("smooth", true));

      const plannerEndpoint = plannerChatEndpointFor(PLANNER_MODEL_ENDPOINT);
      const plannerRequestUrl = USE_PLANNER_DEV_PROXY ? PLANNER_DEV_PROXY_PATH : plannerEndpoint;
      if (!plannerRequestUrl) {
        throw new Error("Planner endpoint is not configured.");
      }

      // Exa search runs before clarifying questions so follow-ups can use web context too.
      const clarifyExaResult = await runExaSearch(promptText, "clarify");
      const clarifyExaData = clarifyExaResult.data;
      const clarifyExaSucceeded = Boolean(clarifyExaData?.results?.length);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === clarifyMsgId
            ? {
                ...msg,
                exaStatus: clarifyExaSucceeded
                  ? { results: clarifyExaData.results.slice(0, 5) }
                  : null,
                exaWebSearchSuccess: clarifyExaSucceeded,
                exaWebSearchError: clarifyExaResult.error ? String(clarifyExaResult.error) : ""
              }
            : msg
        )
      );
      const clarifyExaContext = formatExaContext(clarifyExaData);

      const clarifyPayload = {
        model: PLANNER_MODEL_ID,
        temperature: 0.5,
        stream: true,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content:
              "You are a simulation planner assistant. Before generation, verify whether TWO required study parameters are present in the user request:\n1) n = number of representatives\n2) simulation_days = number of days to run the simulation\n\nRules:\n- If BOTH parameters are clearly specified, output exactly: NO_FOLLOWUPS\n- If EITHER parameter is missing or ambiguous, output EXACTLY ONE numbered follow-up question (only item '1.')\n- If both are missing, ask for both in that single question\n- If one is present, ask only for the missing one\n- Do NOT ask any other questions in this step\n- Output only NO_FOLLOWUPS or the one numbered question (no extra prose)"
          },
          {
            role: "user",
            content:
              `Simulation request: "${promptText}"\n\n` +
              `Attached context files: ${filesForSubmit.length}\n\n` +
              "Determine whether follow-up questions are needed." +
              clarifyExaContext
          }
        ]
      };

      const clarifyText = await streamPlannerReplyIntoMessage({
        requestUrl: plannerRequestUrl,
        payload: clarifyPayload,
        assistantTurnId: clarifyMsgId,
        timeoutMs: CLARIFY_TIMEOUT_MS
      });

      const cleanedClarifyText = stripThinkSections(clarifyText);
      if (cleanedClarifyText.trim().toUpperCase() === "NO_FOLLOWUPS") {
        const assistantPendingTurnId = createRuntimeId("assistant");
        const generationThinkingPlaceholder = pickThinkingPlaceholder();
        setChatMessages((prev) => [
          ...prev.filter((m) => m.id !== clarifyMsgId),
          {
            id: assistantPendingTurnId,
            role: "assistant",
            content: generationThinkingPlaceholder,
            pending: true,
            uiType: "thinking-placeholder",
            thinkingPlaceholder: generationThinkingPlaceholder,
            startedAtMs: Date.now(),
            requestedSampleCount
          }
        ]);
        try {
          await runMainQuery(promptText, filesForSubmit, assistantPendingTurnId);
        } catch (error) {
          const failureTimeMs = Date.now();
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantPendingTurnId
                ? { ...msg, content: `Planner request failed: ${error.message || "Unknown error."}`, pending: false, error: true, thinkingDurationSec: Math.max(0.1, (failureTimeMs - (typeof msg.startedAtMs === "number" ? msg.startedAtMs : failureTimeMs)) / 1000) }
                : msg
            )
          );
        }
        return;
      }

      const questionLines = extractClarifyingQuestionLines(cleanedClarifyText);

      if (questionLines.length === 0) {
        // Timed out or failed — go straight to main response
        const assistantPendingTurnId = createRuntimeId("assistant");
        const generationThinkingPlaceholder = pickThinkingPlaceholder();
        setChatMessages((prev) => [
          ...prev.filter((m) => m.id !== clarifyMsgId),
          {
            id: assistantPendingTurnId,
            role: "assistant",
            content: generationThinkingPlaceholder,
            pending: true,
            uiType: "thinking-placeholder",
            thinkingPlaceholder: generationThinkingPlaceholder,
            startedAtMs: Date.now(),
            requestedSampleCount
          }
        ]);
        try {
          await runMainQuery(promptText, filesForSubmit, assistantPendingTurnId);
        } catch (error) {
          const failureTimeMs = Date.now();
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantPendingTurnId
                ? { ...msg, content: `Planner request failed: ${error.message || "Unknown error."}`, pending: false, error: true, thinkingDurationSec: Math.max(0.1, (failureTimeMs - (typeof msg.startedAtMs === "number" ? msg.startedAtMs : failureTimeMs)) / 1000) }
                : msg
            )
          );
        }
        return;
      }

      const limitedQuestionLines = limitClarifyingQuestions(questionLines);
      const limitedQuestionText = limitedQuestionLines.join("\n");
      const preserveThinkParsing = /<think\s*>/i.test(clarifyText);
      const { thinkText: clarifyThinkText } = splitAssistantThinkContent(
        clarifyText,
        preserveThinkParsing
      );
      const normalizedClarifyThinkText = clarifyThinkText.trim();
      const finalizedClarifyContent = normalizedClarifyThinkText
        ? `<think>\n${normalizedClarifyThinkText}\n</think>\n\n${limitedQuestionText}`
        : limitedQuestionText;
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === clarifyMsgId
            ? { ...msg, content: finalizedClarifyContent, pending: false }
            : msg
        )
      );

      // Clarifying response is already streamed and finalized; now wait for user follow-up.
      setClarifyState({
        originalPrompt: promptText,
        filesForSubmit,
        followUpQuestionCount: limitedQuestionLines.length
      });
      window.requestAnimationFrame(() => scrollChatToBottom("smooth", true));

    } catch (error) {
      console.error("Composer submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`app-shell ${isGraphPanelOpen ? "graph-panel-open" : ""} ${
        isGraphPanelResizing ? "graph-panel-resizing" : ""
      }`}
      style={{ "--graph-panel-width": `${graphPanelWidth}px` }}
    >
      <DotWaveBackground />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        accept=".pdf,.txt,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.xml,.html,.htm,.doc,.docx,.rtf,.png,.jpg,.jpeg,text/*,image/png,image/jpeg"
        multiple
        onChange={handleFilePickerChange}
      />

      <aside className={`graph-panel-shell ${isGraphPanelOpen ? "open" : ""}`} aria-hidden={!isGraphPanelOpen}>
        <section className="graph-panel" aria-label="Network graph panel">
          <GraphCirclePanel
            graph={graphPanelGraph}
            simulationData={simulationData}
            simulationReport={simulationReport}
            simulationStatus={simulationStatus}
          />
        </section>
        <button
          type="button"
          className="graph-panel-resizer"
          aria-label="Resize network graph panel"
          onPointerDown={handleGraphPanelResizeStart}
          onKeyDown={handleGraphPanelResizeKeyDown}
        />
      </aside>

      <main className="main-panel">
        <section
          className={`hero ${isHeroCompacted ? "chat-active" : ""} ${
            isHeroCompacted && contextFiles.length > 0 ? "chat-active-with-context" : ""
          }`}
        >
          <div
            ref={heroCopyRef}
            className={`hero-copy ${isChatActive ? "hidden" : ""} ${isHeroCompacted ? "collapsed" : ""}`}
          >
            <h1>{displayTitle}</h1>
            <p className={`hero-subtitle ${showSubtitle ? "visible" : ""}`}>Simulate Anything</p>
          </div>

          <section
            className={`chat-thread ${isHeroCompacted ? "visible" : "hidden"}`}
            aria-live="polite"
            aria-hidden={!isHeroCompacted}
            ref={chatScrollRef}
            onScroll={handleChatThreadScroll}
          >
            <div className="chat-scroll">
              <div className="chat-spacer" aria-hidden="true" />
              {chatMessages.map((message) => {
                const isArtifactMessage = messageShouldRenderCsvArtifact(message);
                const isStatusTooltipMessage =
                  message.role === "assistant" && message.uiType === "status-tooltip";
                const hasThinkSection = messageHasThinkSection(message);
                return (
                  <article
                    className={`chat-row ${message.role} ${isArtifactMessage ? "artifact" : ""} ${
                      isStatusTooltipMessage ? "status-tooltip" : ""
                    }`}
                    key={message.id}
                  >
                    <div
                      className={`chat-bubble ${message.role} ${message.pending ? "pending" : ""} ${message.error ? "error" : ""} ${isArtifactMessage ? "artifact" : ""} ${
                        isStatusTooltipMessage ? "status-tooltip" : ""
                      } ${hasThinkSection ? "has-think" : ""}`}
                    >
                      <div className="chat-content">
                        {renderMessageContent(message, {
                          onOpenArtifact: handleOpenArtifactModal,
                          onQueueArtifactDownload: handleQueueArtifactDownload,
                          isArtifactDownloadQueued
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <form
            ref={composerShellRef}
            className={`composer-shell ${isHeroCompacted ? "chat-docked" : ""}`}
            onSubmit={handleComposerSubmit}
          >
            <div className={`composer-frame ${contextFiles.length > 0 ? "with-context" : ""}`}>
              <div
                className={`context-preview-wrapper ${contextFiles.length > 0 ? "visible" : "hidden"}`}
                aria-hidden={contextFiles.length === 0}
              >
                <div className="context-preview-row" aria-label="Attached context files">
                  {contextFiles.map((contextFile) => {
                    const isRemoving = removingContextIds.has(contextFile.id);
                    return (
                      <article
                        className={`context-chip ${isRemoving ? "removing" : ""}`}
                        key={contextFile.id}
                        ref={(node) => {
                          if (node) {
                            contextChipRefs.current.set(contextFile.id, node);
                            return;
                          }
                          contextChipRefs.current.delete(contextFile.id);
                        }}
                        role="button"
                        tabIndex={isRemoving ? -1 : 0}
                        onClick={() => {
                          if (isRemoving) return;
                          setPreviewTarget(contextFile);
                        }}
                        onKeyDown={(event) => {
                          if (isRemoving) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setPreviewTarget(contextFile);
                          }
                        }}
                      >
                        <div className="context-chip-top">
                          <p className="context-chip-name" title={contextFile.path}>
                            {fileNameFromPath(contextFile.path)}
                          </p>
                          <button
                            type="button"
                            className="context-chip-remove"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveContextFile(contextFile.id);
                            }}
                            aria-label={`Remove ${contextFile.file.name}`}
                            disabled={isRemoving}
                          >
                            <img src={closeIcon} alt="" />
                          </button>
                        </div>
                        <p className="context-chip-meta">
                          {fileLabel(contextFile.file)} • {formatBytes(contextFile.file.size)}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="composer">
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="Attach context files"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <img src={addIcon} alt="" />
                </button>
                <input
                  ref={composerInputRef}
                  type="text"
                  value={scenarioText}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setIsSpeechDrivenInput(false);
                    scenarioTextRef.current = nextValue;
                    setScenarioText(nextValue);
                  }}
                  placeholder={composerPlaceholder}
                  aria-label="Simulation scenario"
                />
                <button
                  className={`send-btn composer-primary-action ${isRecordingSpeech ? "recording" : ""}`}
                  type="submit"
                  aria-label="Send input"
                  disabled={isSubmitting || isTranscribingSpeech || isSystemPrompting}
                >
                  <img
                    src={isRecordingSpeech ? waveformIcon : scenarioText.trim() ? arrowUpIcon : waveformIcon}
                    alt=""
                  />
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {previewTarget ? (
        <div
          className="preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Attachment preview"
          onClick={() => setPreviewTarget(null)}
        >
          <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <header className="preview-header">
              <div className="preview-header-text">
                <p className="preview-title" title={previewTarget.path}>
                  {fileNameFromPath(previewTarget.path)}
                </p>
                <p className="preview-meta">
                  {fileLabel(previewTarget.file)} • {formatBytes(previewTarget.file.size)}
                </p>
              </div>
              <button
                type="button"
                className="preview-close-btn"
                onClick={() => setPreviewTarget(null)}
                aria-label="Close preview"
              >
                <img src={closeIcon} alt="" />
              </button>
            </header>

            <div className="preview-content">
              {previewMode === "image" ? <img src={previewUrl} alt={previewTarget.file.name} className="preview-image" /> : null}
              {previewMode === "pdf" ? (
                <iframe src={previewUrl} title={previewTarget.file.name} className="preview-pdf" />
              ) : null}
              {previewMode === "text-loading" ? <p className="preview-note">Loading preview...</p> : null}
              {previewMode === "text" ? <pre className="preview-text">{previewText}</pre> : null}
              {previewMode === "unsupported" ? (
                <div className="preview-unsupported">
                  <p className="preview-note">No inline preview is available for this file type.</p>
                  {previewUrl ? (
                    <a
                      className="preview-download-link"
                      href={previewUrl}
                      download={previewTarget.file.name}
                    >
                      Download file
                    </a>
                  ) : null}
                </div>
              ) : null}
              {previewError ? <p className="preview-note warning">{previewError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {artifactModal ? (
        <div
          className={`artifact-backdrop ${isArtifactModalClosing ? "closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="CSV output preview"
          onClick={closeArtifactModalWithAnimation}
        >
          <div className="artifact-modal" onClick={(event) => event.stopPropagation()}>
            <header className="artifact-header">
              <div className="artifact-header-text">
                <p className="artifact-title">Generated CSV Content</p>
                <p className="artifact-meta">Live output preview</p>
              </div>
              <button
                type="button"
                className="artifact-close-btn"
                onClick={closeArtifactModalWithAnimation}
                aria-label="Close CSV preview"
              >
                <img src={closeIcon} alt="" />
              </button>
            </header>

            <div className="artifact-content">
              <CsvPreviewTable csvText={artifactModal.content} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

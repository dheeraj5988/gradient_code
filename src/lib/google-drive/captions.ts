/** Subtitle helpers (pure, no I/O). Browsers only play WebVTT in <track>, so SRT is converted on the fly. */

/** Converts SRT (or passes through WebVTT) to a clean WebVTT document. Strips any markup except basic <i>/<b>/<u>. */
export function toWebVtt(input: string, format: "srt" | "vtt"): string {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (format === "vtt" || /^WEBVTT/.test(text)) return text.startsWith("WEBVTT") ? text : `WEBVTT\n\n${text}`;
  const cues = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) return null;
      const timing = lines[i].replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, "$1.$2").replace(/(^|\s)(\d{2}:\d{2}),(\d{3})/g, "$1$2.$3");
      const body = lines.slice(i + 1).join("\n").replace(/<(?!\/?[ibu]>)[^>]*>/gi, "").replace(/\{\\[^}]*\}/g, "");
      return `${timing}\n${body}`;
    })
    .filter((c): c is string => !!c);
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

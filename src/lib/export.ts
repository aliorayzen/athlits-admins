/**
 * Client-side CSV and PDF export utilities.
 * No external dependencies -- uses browser-native APIs.
 */

function escapeCSV(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
) {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  const csv = [headerLine, ...dataLines].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function downloadPDF(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
  meta?: { label: string; value: string }[],
) {
  const metaHTML = meta
    ? meta
        .map(
          (m) =>
            `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee"><span style="color:#666">${m.label}</span><span style="font-weight:600">${m.value}</span></div>`,
        )
        .join("")
    : "";

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px">${cell ?? ""}</td>`).join("")}</tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head>
<title>${title}</title>
<style>
  @media print { @page { margin: 20mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #888; font-size: 13px; margin-bottom: 20px; }
  .meta { background: #f9f9f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 2px solid #e5e5e5; }
  tr:hover { background: #fafafa; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
</style>
</head><body>
<h1>${title}</h1>
<div class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
${metaHTML ? `<div class="meta">${metaHTML}</div>` : ""}
<table>
  <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div class="footer"><span>Athlits Admin Dashboard</span><span>${rows.length} record${rows.length !== 1 ? "s" : ""}</span></div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      win.print();
      URL.revokeObjectURL(url);
    });
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";

const BACKEND_ROOT = API_ROOT.replace(/\/api\/?$/i, "").replace(/\/$/, "");

const REPORT_FILE_FIELDS = [
  "fileUrl",
  "reportFile",
  "attachmentUrl",
  "resultFile",
  "file",
  "url",
  "path",
];

function encodePath(pathValue) {
  return String(pathValue || "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function getBackendFileUrl(fileUrl) {
  const value = String(fileUrl || "").trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/uploads") || value.startsWith("uploads")) {
    return `${BACKEND_ROOT}/${encodePath(value)}`;
  }

  return "";
}

export function getReportFileUrl(reportOrUrl) {
  if (typeof reportOrUrl === "string") return getBackendFileUrl(reportOrUrl);

  const fileValue = REPORT_FILE_FIELDS.map((field) => reportOrUrl?.[field]).find(Boolean);
  return getBackendFileUrl(fileValue);
}

export async function openBackendFile(reportOrUrl) {
  const url = getReportFileUrl(reportOrUrl);
  if (!url) {
    window.alert("Unable to open this report file.");
    return false;
  }

  try {
    const targetUrl = new URL(url, window.location.href);
    const backendUrl = new URL(BACKEND_ROOT);

    if (targetUrl.origin === backendUrl.origin && targetUrl.pathname.startsWith("/uploads/")) {
      const response = await fetch(targetUrl.toString(), { method: "HEAD" });
      if (!response.ok) {
        window.alert("Unable to open this report file.");
        return false;
      }
    }
  } catch {
    window.alert("Unable to open this report file.");
    return false;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.alert("Unable to open this report file.");
    return false;
  }

  return true;
}

/** Trigger a browser file download from bytes or a string. */
export function downloadBlobFile(
  data: string | ArrayBuffer | Uint8Array,
  filename: string,
  mime: string
): void {
  const part =
    typeof data === "string"
      ? data
      : data instanceof Uint8Array
        ? data.slice()
        : new Uint8Array(data);
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Delay revoke — some browsers cancel the download if the URL dies immediately.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

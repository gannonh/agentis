import { useEffect, useRef } from "react";
import type { Evidence } from "../../src/schema.js";
import type { ArtifactPreview } from "./workspace-store.js";

const safeHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
};

const SourceUrl = ({ value }: { readonly value: string }) => {
  const href = safeHttpUrl(value);
  return href ? (
    <a href={href} rel="noreferrer" target="_blank">
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );
};

const focusable = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hasAttribute("hidden"));

export const ArtifactDialog = ({
  preview,
  evidence,
  opener,
  onClose,
}: {
  readonly preview: ArtifactPreview;
  readonly evidence: readonly Evidence[];
  readonly opener: HTMLElement | null;
  readonly onClose: () => void;
}) => {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    (focusable(element)[0] ?? element).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const targets = focusable(element);
      if (targets.length === 0) {
        event.preventDefault();
        element.focus();
        return;
      }
      const first = targets[0];
      const last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose, opener]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="artifact-dialog-title"
        aria-modal="true"
        className="dialog"
        ref={dialog}
        role="dialog"
        tabIndex={-1}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Retained result</p>
            <h2 id="artifact-dialog-title">Artifact preview</h2>
          </div>
          <button aria-label="Close artifact preview" className="quiet-button" onClick={onClose}>
            Close
          </button>
        </div>

        {preview.status === "loading" ? <p role="status">Loading verified artifact…</p> : null}
        {preview.status === "error" ? <p className="error-copy">{preview.error}</p> : null}
        {preview.status === "download_only" ? (
          <p>This result is download-only and is not buffered or rendered in the workspace.</p>
        ) : null}
        {preview.status === "ready" ? <pre className="artifact-text">{preview.text}</pre> : null}

        <section aria-labelledby="artifact-provenance">
          <h3 id="artifact-provenance">Provenance</h3>
          <dl className="artifact-provenance">
            <div><dt>Author</dt><dd>{preview.artifact.author}</dd></div>
            <div><dt>Provider</dt><dd>{preview.artifact.source}</dd></div>
            <div><dt>SHA-256</dt><dd>{preview.artifact.sha256}</dd></div>
          </dl>
          {evidence.map((item) => (
            <article className="evidence-card" key={item.id}>
              <strong>{item.label}</strong>
              <span>{item.source === "github_briefing" ? "GitHub briefing packet" : "Pasted input"}</span>
              {item.repository ? <span>Repository: {item.repository}</span> : null}
              {item.revision ? <span>Revision: {item.revision}</span> : null}
              {item.url ? <SourceUrl value={item.url} /> : null}
              <span>Source SHA-256: {item.contentDigest}</span>
            </article>
          ))}
        </section>

        {preview.artifact.citations.length > 0 ? (
          <section aria-labelledby="artifact-citations">
            <h3 id="artifact-citations">Citations</h3>
            <ul className="citation-list">
              {preview.artifact.citations.map((citation, index) => (
                <li key={`${citation.label}-${index}`}>
                  <strong>{citation.label}</strong>
                  <span>{citation.excerpt}</span>
                  {citation.url ? <SourceUrl value={citation.url} /> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <a className="button-link" download href={preview.artifact.contentUrl}>
          Download verified artifact
        </a>
      </div>
    </div>
  );
};

/**
 * Minimal floating translation tooltip for context-menu selection translation.
 * Pure DOM-based — no React dependency.
 */

let activeTooltip: HTMLElement | null = null

function dismissTooltip() {
  if (activeTooltip) {
    activeTooltip.remove()
    activeTooltip = null
    document.removeEventListener("click", dismissTooltip, true)
  }
}

export function showTranslationTooltip(originalText: string, translatedText: string) {
  // Dismiss any existing tooltip
  dismissTooltip()

  const tooltip = document.createElement("div")
  tooltip.className = "vibe-reading-context-translation-tooltip"

  // Try to position near the selection
  const sel = window.getSelection()
  let top = 80
  if (sel && sel.rangeCount > 0) {
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    top = rect.bottom + 8
  }

  tooltip.innerHTML = `
    <style>
      .vibe-reading-context-translation-tooltip {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        max-width: 560px;
        width: max-content;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        padding: 14px 18px;
        animation: vibe-reading-tooltip-in 0.15s ease-out;
      }
      @keyframes vibe-reading-tooltip-in {
        from { opacity: 0; transform: translateX(-50%) translateY(4px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .vibe-reading-ctx-original {
        color: #94a3b8;
        font-size: 12px;
        margin-bottom: 6px;
        max-height: 48px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .vibe-reading-ctx-translated {
        color: #1e293b;
        word-break: break-word;
      }
      .vibe-reading-ctx-close {
        position: absolute;
        top: 6px;
        right: 10px;
        background: none;
        border: none;
        cursor: pointer;
        color: #94a3b8;
        font-size: 16px;
        line-height: 1;
        padding: 2px 4px;
        border-radius: 4px;
      }
      .vibe-reading-ctx-close:hover {
        color: #64748b;
        background: #f1f5f9;
      }
      @media (prefers-color-scheme: dark) {
        .vibe-reading-context-translation-tooltip {
          background: #1e293b;
          border-color: #334155;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .vibe-reading-ctx-original { color: #64748b; }
        .vibe-reading-ctx-translated { color: #e2e8f0; }
        .vibe-reading-ctx-close { color: #64748b; }
        .vibe-reading-ctx-close:hover { color: #94a3b8; background: #334155; }
      }
    </style>
    <button class="vibe-reading-ctx-close" title="关闭">&times;</button>
    <div class="vibe-reading-ctx-original">${escapeHtml(originalText)}</div>
    <div class="vibe-reading-ctx-translated">${escapeHtml(translatedText)}</div>
  `

  tooltip.style.top = `${top}px`

  document.body.appendChild(tooltip)
  activeTooltip = tooltip

  // Close on click outside
  setTimeout(() => {
    document.addEventListener("click", dismissTooltip, true)
  }, 0)

  // Auto dismiss after 30s
  setTimeout(dismissTooltip, 30_000)
}

function escapeHtml(text: string): string {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

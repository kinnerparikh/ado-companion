/**
 * Content script injected on ADO build result pages.
 * Parses the URL to extract org/project/buildId, checks with the
 * service worker whether the build is already tracked, and offers
 * a small floating popup to start tracking it.
 */

function parseBuildUrl(): { org: string; project: string; buildId: number } | null {
  const match = window.location.href.match(
    /https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_build\/results\?buildId=(\d+)/
  );
  if (!match) return null;
  return {
    org: match[1],
    project: decodeURIComponent(match[2]),
    buildId: parseInt(match[3], 10),
  };
}

function createBanner(onTrack: () => void): HTMLDivElement {
  const banner = document.createElement("div");
  banner.id = "ado-companion-track-banner";
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 999999;
    background: #1e293b;
    color: #f1f5f9;
    border-radius: 10px;
    padding: 12px 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 340px;
    animation: ado-slide-in 0.3s ease-out;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes ado-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes ado-slide-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const text = document.createElement("span");
  text.textContent = "Track this build in ADO Companion?";
  text.style.flex = "1";

  const trackBtn = document.createElement("button");
  trackBtn.textContent = "Track";
  trackBtn.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  `;
  trackBtn.addEventListener("mouseenter", () => { trackBtn.style.background = "#2563eb"; });
  trackBtn.addEventListener("mouseleave", () => { trackBtn.style.background = "#3b82f6"; });
  trackBtn.addEventListener("click", () => {
    onTrack();
    dismissBanner(banner, "✓ Tracking!");
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    background: none;
    color: #94a3b8;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 0 2px;
    line-height: 1;
  `;
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#f1f5f9"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#94a3b8"; });
  closeBtn.addEventListener("click", () => {
    dismissBanner(banner);
  });

  banner.appendChild(text);
  banner.appendChild(trackBtn);
  banner.appendChild(closeBtn);

  return banner;
}

function dismissBanner(banner: HTMLDivElement, message?: string) {
  if (message) {
    banner.textContent = message;
    banner.style.gap = "0";
    setTimeout(() => removeBanner(banner), 1200);
  } else {
    removeBanner(banner);
  }
}

function removeBanner(banner: HTMLDivElement) {
  banner.style.animation = "ado-slide-out 0.2s ease-in forwards";
  setTimeout(() => banner.remove(), 200);
}

async function init() {
  const info = parseBuildUrl();
  if (!info) return;

  // Ask service worker if this build should be tracked
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_BUILD_TRACKED",
      payload: info,
    });

    if (response?.alreadyTracked || !response?.isConfiguredOrg) return;

    // Show the tracking banner
    const banner = createBanner(() => {
      chrome.runtime.sendMessage({
        type: "TRACK_BUILD",
        payload: info,
      });
    });

    document.body.appendChild(banner);
  } catch {
    // Extension context may not be available
  }
}

init();

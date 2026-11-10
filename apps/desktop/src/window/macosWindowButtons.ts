import type * as Electron from "electron";

// Match --workspace-topbar-height in apps/web/src/index.css; native macOS buttons stay 14 points at any zoom.
export const MACOS_WORKSPACE_TOPBAR_HEIGHT = 52;
export const MACOS_WINDOW_BUTTON_RADIUS = 7;

const hiddenWindowButtons = new WeakSet<Electron.BrowserWindow>();

export function syncMacosWindowButtons(window: Electron.BrowserWindow): void {
  if (window.isDestroyed()) return;
  // Full screen shows the buttons in the menu-bar overlay, which the sidebar never covers.
  if (window.isFullScreen()) {
    window.setWindowButtonVisibility(true);
    return;
  }
  // Showing the buttons lays them out at the macOS default, so position them afterwards.
  window.setWindowButtonVisibility(!hiddenWindowButtons.has(window));
  window.setWindowButtonPosition({
    x: 16,
    y: Math.round(
      (MACOS_WORKSPACE_TOPBAR_HEIGHT * window.webContents.getZoomFactor()) / 2 -
        MACOS_WINDOW_BUTTON_RADIUS,
    ),
  });
}

/** The renderer hides the native buttons while its sidebar draws its own. */
export function setMacosWindowButtonsVisible(window: Electron.BrowserWindow, visible: boolean) {
  if (visible) hiddenWindowButtons.delete(window);
  else hiddenWindowButtons.add(window);
  syncMacosWindowButtons(window);
}

/** A reloading renderer has not drawn its sidebar yet, so the native buttons come back. */
export function resetMacosWindowButtons(window: Electron.BrowserWindow): void {
  setMacosWindowButtonsVisible(window, true);
}

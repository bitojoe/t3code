import { describe, expect, it, vi } from "vite-plus/test";
import type * as Electron from "electron";

import { resetMacosWindowButtons, setMacosWindowButtonsVisible } from "./macosWindowButtons.ts";

function fakeWindow(options: { fullScreen?: boolean } = {}) {
  const window = {
    isDestroyed: () => false,
    isFullScreen: () => options.fullScreen ?? false,
    setWindowButtonPosition: vi.fn(),
    setWindowButtonVisibility: vi.fn(),
    webContents: { getZoomFactor: () => 1 },
  };
  return { window: window as unknown as Electron.BrowserWindow, fake: window };
}

describe("macOS window buttons", () => {
  it("hides for the sidebar and returns when the renderer reloads", () => {
    const { window, fake } = fakeWindow();

    setMacosWindowButtonsVisible(window, false);
    expect(fake.setWindowButtonVisibility).toHaveBeenLastCalledWith(false);

    resetMacosWindowButtons(window);
    expect(fake.setWindowButtonPosition).toHaveBeenLastCalledWith({ x: 16, y: 19 });
    expect(fake.setWindowButtonVisibility).toHaveBeenLastCalledWith(true);
    expect(fake.setWindowButtonPosition.mock.invocationCallOrder.at(-1)).toBeGreaterThan(
      fake.setWindowButtonVisibility.mock.invocationCallOrder.at(-1)!,
    );
  });

  it("keeps the buttons visible in full screen", () => {
    const { window, fake } = fakeWindow({ fullScreen: true });

    setMacosWindowButtonsVisible(window, false);

    expect(fake.setWindowButtonVisibility).toHaveBeenLastCalledWith(true);
    expect(fake.setWindowButtonPosition).not.toHaveBeenCalled();
  });
});

import type { DesktopWindowAction } from "@t3tools/contracts";
import type { MouseEvent, ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { cn } from "../../lib/utils";

function subscribeToWindowFocus(onChange: () => void) {
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
  };
}

const readWindowFocus = () => document.hasFocus();

const BUTTONS = [
  {
    label: "Close window",
    color: "bg-[#ff5f57]",
    hoverColor: "group-hover/window-controls:bg-[#ff5f57]",
    action: () => "close",
    glyph: <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" strokeWidth="1.25" strokeLinecap="round" />,
  },
  {
    label: "Minimize window",
    color: "bg-[#febc2e]",
    hoverColor: "group-hover/window-controls:bg-[#febc2e]",
    action: () => "minimize",
    glyph: <path d="M2 5h6" strokeWidth="1.25" strokeLinecap="round" />,
  },
  {
    label: "Enter full screen",
    color: "bg-[#28c840]",
    hoverColor: "group-hover/window-controls:bg-[#28c840]",
    // Option-click zooms instead, as on the native button.
    action: (event: MouseEvent) => (event.altKey ? "zoom" : "toggle-full-screen"),
    glyph: <path d="M2.75 6.75v-4h4zM7.25 3.25v4h-4z" stroke="none" fill="currentColor" />,
  },
] satisfies ReadonlyArray<{
  label: string;
  color: string;
  hoverColor: string;
  action: (event: MouseEvent) => DesktopWindowAction;
  glyph: ReactNode;
}>;

/** Stand-ins for the native macOS window buttons while they cannot move with a sliding sidebar. */
export function MacosWindowControls({ className }: { readonly className?: string }) {
  const focused = useSyncExternalStore(subscribeToWindowFocus, readWindowFocus);

  return (
    <div className={cn("group/window-controls items-center gap-2.25", className)}>
      {BUTTONS.map((button) => (
        <button
          key={button.label}
          type="button"
          tabIndex={-1}
          aria-label={button.label}
          className={cn(
            "flex size-3.5 items-center justify-center rounded-full text-black/60 inset-ring inset-ring-black/15",
            focused ? button.color : ["bg-black/15 dark:bg-white/20", button.hoverColor],
          )}
          onClick={(event) => void window.desktopBridge?.performWindowAction(button.action(event))}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 10 10"
            className="size-2.5 stroke-current opacity-0 group-hover/window-controls:opacity-100"
            fill="none"
          >
            {button.glyph}
          </svg>
        </button>
      ))}
    </div>
  );
}

import { page, userEvent } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { render } from "../../../test/render";
import { Sidebar, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar } from "./sidebar";

function CollapseFromInside() {
  const { setOpen } = useSidebar();
  return (
    <button type="button" onClick={() => setOpen(false)}>
      Collapse
    </button>
  );
}

function Harness(props: { readonly onResize?: (width: number) => void }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        collapsible="offcanvas"
        resizable={{
          minWidth: 200,
          maxWidth: 600,
          ...(props.onResize ? { onResize: props.onResize } : {}),
        }}
      >
        <CollapseFromInside />
        <SidebarRail />
      </Sidebar>
      <SidebarTrigger />
    </SidebarProvider>
  );
}

describe("Sidebar", () => {
  it("hands focus to the outside trigger when it collapses around the focused control", async () => {
    await page.viewport(1280, 800);
    await using screen = await render(<Harness />, { router: false /* no routes involved */ });

    await userEvent.click(screen.getByRole("button", { name: "Collapse" }));

    const sidebar = screen.container.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    await vi.waitFor(() => expect(sidebar.inert).toBe(true));
    const trigger = screen.container.querySelector('[data-slot="sidebar-trigger"]');
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("abandons a rail drag when the sidebar collapses mid-drag", async () => {
    await page.viewport(1280, 800);
    const onResize = vi.fn();
    await using screen = await render(<Harness onResize={onResize} />, {
      router: false /* no routes involved */,
    });
    const rail = screen.container.querySelector<HTMLElement>('[data-sidebar="rail"]')!;
    const { left, top } = rail.getBoundingClientRect();
    const pointer = { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientY: top + 10 };
    const dragTo = (clientX: number) => {
      rail.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, clientX: left }));
      rail.dispatchEvent(new PointerEvent("pointermove", { ...pointer, clientX }));
    };
    // A completed drag commits, so the abandoned one below is a real drag too.
    dragTo(left + 40);
    rail.dispatchEvent(new PointerEvent("pointerup", { ...pointer, clientX: left + 40 }));
    expect(onResize).toHaveBeenCalledTimes(1);

    dragTo(left + 80);
    await userEvent.click(
      screen.container.querySelector<HTMLElement>('[data-slot="sidebar-trigger"]')!,
    );
    rail.dispatchEvent(new PointerEvent("pointerup", { ...pointer, clientX: left + 80 }));

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("peeks a collapsed sidebar when the pointer leaves the window past its edge", async () => {
    await page.viewport(1280, 800);
    await using screen = await render(
      <SidebarProvider defaultOpen={false}>
        {/* Browser tests load no app CSS, so the sidebar needs its own width. */}
        <Sidebar collapsible="offcanvas" peekOnHover style={{ width: 256 }}>
          <button type="button">Thread</button>
        </Sidebar>
        <main style={{ position: "fixed", top: 0, right: 0 }}>Content</main>
        <SidebarTrigger />
      </SidebarProvider>,
      { router: false /* no routes involved */ },
    );
    const sidebar = screen.container.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    const content = screen.getByText("Content");
    const leaveWindow = (clientX: number) =>
      document.body.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, clientX, clientY: 400 }),
      );
    const peekAtScreenEdge = () =>
      screen.container
        .querySelector('[data-slot="sidebar-peek-zone"]')!
        .dispatchEvent(
          new PointerEvent("pointerover", { bubbles: true, clientX: 2, clientY: 400 }),
        );
    expect(sidebar.inert).toBe(true);

    leaveWindow(400);
    expect(sidebar.getAttribute("data-peek")).toBeNull();
    leaveWindow(-3);
    await vi.waitFor(() => expect(sidebar.getAttribute("data-peek")).toBe("open"));
    expect(sidebar.inert).toBe(false);
    await userEvent.hover(screen.getByRole("button", { name: "Thread" }));
    await userEvent.hover(content);
    await vi.waitFor(() => expect(sidebar.inert).toBe(true));
    expect(sidebar.getAttribute("data-peek")).toBe("closed");

    // Pinning from a peek and collapsing again slides the sidebar away as it sits, not as a card.
    peekAtScreenEdge();
    await vi.waitFor(() => expect(sidebar.getAttribute("data-peek")).toBe("open"));
    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute("aria-pressed", "false");
    expect(sidebar.getAttribute("data-peek")).toBeNull();
    expect(sidebar.inert).toBe(true);
  });
});

it("restores collapsed and expanded desktop state after remounting", async () => {
  await page.viewport(1280, 800);
  const storageKey = "sidebar_persistence_test";
  localStorage.removeItem(storageKey);
  const layout = () => (
    <SidebarProvider storageKey={storageKey}>
      <SidebarTrigger />
    </SidebarProvider>
  );
  {
    await using screen = await render(layout(), { router: false /* no routes involved */ });
    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    await expect.element(trigger).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute("aria-pressed", "false");
  }
  {
    await using screen = await render(layout(), { router: false /* no routes involved */ });
    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    await expect.element(trigger).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(trigger);
  }
  await using screen = await render(layout(), { router: false /* no routes involved */ });
  await expect
    .element(screen.getByRole("button", { name: "Toggle Sidebar" }))
    .toHaveAttribute("aria-pressed", "true");
  localStorage.removeItem(storageKey);
});

it("keeps the mobile sheet closed and leaves the saved desktop state alone", async () => {
  await page.viewport(390, 844);
  const storageKey = "sidebar_mobile_persistence_test";
  localStorage.setItem(storageKey, "false");
  {
    await using screen = await render(
      <SidebarProvider storageKey={storageKey}>
        <SidebarTrigger />
      </SidebarProvider>,
      { router: false /* no routes involved */ },
    );
    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    await expect.element(trigger).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(storageKey)).toBe("false");
  }
  await using screen = await render(
    <SidebarProvider storageKey={storageKey}>
      <SidebarTrigger />
    </SidebarProvider>,
    { router: false /* no routes involved */ },
  );
  await expect
    .element(screen.getByRole("button", { name: "Toggle Sidebar" }))
    .toHaveAttribute("aria-pressed", "false");
  localStorage.removeItem(storageKey);
});

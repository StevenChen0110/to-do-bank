// Detect the runtime surface so the app can adapt (extension popup/side panel).
export const isExtension =
  typeof location !== 'undefined' && location.protocol === 'chrome-extension:';

export const isExtPopup = isExtension && location.pathname.endsWith('popup.html');

interface ChromeSidePanel {
  windows?: { getCurrent: () => Promise<{ id?: number }> };
  sidePanel?: { open: (opts: { windowId?: number }) => Promise<void> };
}

/** Open the side panel from the popup (must run in a user gesture). */
export async function openSidePanel(): Promise<void> {
  const c = (globalThis as unknown as { chrome?: ChromeSidePanel }).chrome;
  if (!c?.sidePanel || !c.windows) return;
  const win = await c.windows.getCurrent();
  await c.sidePanel.open({ windowId: win.id });
  window.close();
}

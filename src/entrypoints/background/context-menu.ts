import type { Browser } from "#imports"
import { browser, i18n } from "#imports"
import { sendMessage } from "@/utils/message"

export const MENU_ID_SELECTION_TRANSLATE = "vibe-reading-selection-translate"

export function registerContextMenuListeners() {
  browser.contextMenus.onClicked.addListener(handleContextMenuClick)
}

export async function initializeContextMenu() {
  await browser.contextMenus.removeAll()

  browser.contextMenus.create({
    id: MENU_ID_SELECTION_TRANSLATE,
    title: i18n.t("contextMenu.translateSelection"),
    contexts: ["selection"],
  })
}

async function handleContextMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
) {
  if (info.menuItemId !== MENU_ID_SELECTION_TRANSLATE || !tab?.id) {
    return
  }

  const selectionText = info.selectionText?.trim()
  if (!selectionText) {
    return
  }

  const target = typeof info.frameId === "number"
    ? { tabId: tab.id, frameId: info.frameId }
    : tab.id

  void sendMessage("translateSelectionFromContextMenu", { selectionText }, target)
}

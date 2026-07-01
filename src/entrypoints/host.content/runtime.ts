import type { ContentScriptContext } from "#imports"
import type { Config } from "@/types/config/config"
import { isLLMProviderConfig } from "@/types/config/provider"
import { getProviderConfigById } from "@/utils/config/helpers"
import { getLocalConfig } from "@/utils/config/storage"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { detectPageLanguageLightweight } from "@/utils/content/page-language"
import { translateTextCore } from "@/utils/host/translate/translate-text"
import { ensurePresetStyles } from "@/utils/host/translate/ui/style-injector"
import { logger } from "@/utils/logger"
import { onMessage, sendMessage } from "@/utils/message"
import { areSamePageTranslationOrigin } from "@/utils/url"
import { setupUrlChangeListener } from "./listen"
import { mountHostToast } from "./mount-host-toast"
import { showTranslationTooltip } from "./selection-translation-tooltip"
import { bindTranslationShortcutKey } from "./translation-control/bind-translation-shortcut"
import { registerNodeTranslationTriggers } from "./translation-control/node-translation"
import { PageTranslationManager } from "./translation-control/page-translation"

export async function bootstrapHostContent(ctx: ContentScriptContext, initialConfig: Config | null) {
  ensurePresetStyles(document)

  const cleanupUrlListener = setupUrlChangeListener()

  const removeHostToast = window === window.top ? mountHostToast() : () => {}

  const teardownNodeTranslation = registerNodeTranslationTriggers()

  const preloadConfig = initialConfig?.translate.page.preload ?? DEFAULT_CONFIG.translate.page.preload
  const manager = new PageTranslationManager({
    root: null,
    rootMargin: `${preloadConfig.margin}px`,
    threshold: preloadConfig.threshold,
  })

  const cleanupPageTranslationTriggers = manager.registerPageTranslationTriggers()

  const cleanupTranslationShortcut = await bindTranslationShortcutKey(manager)

  const detectAndReportPageLanguage = async (url: string) => {
    const { detectedCodeOrUnd } = await detectPageLanguageLightweight()
    void sendMessage("reportDetectedPageLanguage", { url, detectedCodeOrUnd })
  }

  // For late-loading iframes: check if translation is already enabled for this tab
  let translationEnabled = false
  try {
    translationEnabled = await sendMessage("getEnablePageTranslationFromContentScript", undefined)
  }
  catch (error) {
    // Extension context may be invalidated during update, proceed without auto-start
    logger.error("Failed to check translation state:", error)
  }
  if (translationEnabled) {
    void manager.start()
  }

  const handleUrlChange = async (from: string, to: string) => {
    if (from !== to) {
      logger.info("URL changed from", from, "to", to)
      if (manager.isActive) {
        if (areSamePageTranslationOrigin(from, to)) {
          await manager.restart()
        }
        else {
          manager.stop()
        }
      }
      // Only the top frame should detect and set language to avoid race conditions from iframes
      if (window === window.top) {
        await detectAndReportPageLanguage(to)
      }
    }
  }

  const handleExtensionUrlChange = (e: any) => {
    const { from, to } = e.detail
    void handleUrlChange(from, to)
  }
  window.addEventListener("extension:URLChange", handleExtensionUrlChange)

  // Listen for translation state changes from background
  const cleanupTranslationStateListener = onMessage("askManagerToTogglePageTranslation", (msg) => {
    const { enabled } = msg.data
    if (enabled === manager.isActive)
      return
    enabled ? void manager.start() : manager.stop()
  })

  const cleanupFrameTranslationStateListener = window === window.top
    ? () => {}
    : onMessage("notifyTranslationStateChanged", (msg) => {
        const { enabled } = msg.data
        if (enabled === manager.isActive)
          return
        enabled ? void manager.start() : manager.stop()
      })

  const cleanupDetectedLanguageRefreshListener = window === window.top
    ? onMessage("refreshDetectedPageLanguage", () => {
        void detectAndReportPageLanguage(window.location.href)
      })
    : () => {}

  // Handle selection translation from context menu (right-click)
  const cleanupContextMenuTranslationListener = onMessage(
    "translateSelectionFromContextMenu",
    async (msg) => {
      const { selectionText } = msg.data
      if (!selectionText)
        return

      const config = await getLocalConfig()
      if (!config)
        return

      const providerConfig = getProviderConfigById(
        config.providersConfig,
        config.translate.providerId,
      )
      if (!providerConfig)
        return

      try {
        const result = await translateTextCore({
          text: selectionText,
          langConfig: config.language,
          providerConfig,
          enableAIContentAware: config.translate.enableAIContentAware && isLLMProviderConfig(providerConfig),
          extraHashTags: ["context-menu"],
        })
        showTranslationTooltip(selectionText, result)
      }
      catch (error) {
        logger.error("Context menu translation failed:", error)
        showTranslationTooltip(selectionText, "翻译失败，请检查 API 配置")
      }
    },
  )

  ctx.onInvalidated(() => {
    removeHostToast()
    cleanupUrlListener()
    teardownNodeTranslation()
    cleanupPageTranslationTriggers()
    cleanupTranslationShortcut()
    cleanupTranslationStateListener()
    cleanupFrameTranslationStateListener()
    cleanupDetectedLanguageRefreshListener()
    cleanupContextMenuTranslationListener()
    window.removeEventListener("extension:URLChange", handleExtensionUrlChange)
    window.__READ_FROG_HOST_INJECTED__ = false
  })

  // Only the top frame should detect and set language to avoid race conditions from iframes
  if (window === window.top) {
    await detectAndReportPageLanguage(window.location.href)
  }
}

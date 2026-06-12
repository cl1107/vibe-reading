import type {
  APIProviderConfig,
  CustomLLMProviderConfig,
  LLMProviderConfig,
  NonCustomLLMProviderConfig,
  ProviderConfig,
  TranslateProviderConfig,
} from "./schemas"
import {
  isAPIProvider,
  isCustomLLMProvider,
  isLLMProvider,
  isNonCustomLLMProvider,
  isTranslateProvider,
} from "./constants"

export * from "./constants"
export * from "./schemas"

export function isTranslateProviderConfig(config: ProviderConfig): config is TranslateProviderConfig {
  return isTranslateProvider(config.provider)
}

export function isLLMProviderConfig(config: ProviderConfig): config is LLMProviderConfig {
  return isLLMProvider(config.provider)
}

export function isCustomLLMProviderConfig(config: ProviderConfig): config is CustomLLMProviderConfig {
  return isCustomLLMProvider(config.provider)
}

export function isNonCustomLLMProviderConfig(config: ProviderConfig): config is NonCustomLLMProviderConfig {
  return isNonCustomLLMProvider(config.provider)
}

export function isAPIProviderConfig(config: ProviderConfig): config is APIProviderConfig {
  return isAPIProvider(config.provider)
}

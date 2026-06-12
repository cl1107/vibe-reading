import type { AnalyticsOutcome, AnalyticsSurface, FeatureUsageContext, FeatureUsedEventProperties } from "@/types/analytics"

export interface FeatureUsedEventInput extends FeatureUsageContext {
  outcome: AnalyticsOutcome
  finishedAt?: number
}

export function createFeatureUsageContext(
  feature: FeatureUsageContext["feature"],
  surface: AnalyticsSurface,
  startedAt = Date.now(),
): FeatureUsageContext {
  return {
    feature,
    surface,
    startedAt,
  }
}

export function getLatencyMs(
  startedAt: number,
  finishedAt = Date.now(),
): number {
  return Math.max(0, finishedAt - startedAt)
}

export function buildFeatureUsedEventProperties({
  feature,
  surface,
  outcome,
  startedAt,
  finishedAt = Date.now(),
}: FeatureUsedEventInput): FeatureUsedEventProperties {
  return {
    feature,
    surface,
    outcome,
    latency_ms: getLatencyMs(startedAt, finishedAt),
  }
}

export async function trackFeatureUsed(input: FeatureUsedEventInput): Promise<void> {
  buildFeatureUsedEventProperties(input)
}

export async function trackFeatureAttempt<T>(
  context: FeatureUsageContext,
  run: () => Promise<T>,
): Promise<T> {
  try {
    const result = await run()
    void trackFeatureUsed({
      ...context,
      outcome: "success",
    })
    return result
  }
  catch (error) {
    void trackFeatureUsed({
      ...context,
      outcome: "failure",
    })
    throw error
  }
}

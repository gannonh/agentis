export type PolishedSlideProviderAvailability =
  | { available: true; provider: string; model?: string }
  | {
      available: false
      provider?: string
      code: "static_artifact_provider_unavailable"
      message: string
      remediation: string
    }

export interface PolishedSlideProvider {
  availability(): PolishedSlideProviderAvailability
}

export class UnavailablePolishedSlideProvider implements PolishedSlideProvider {
  availability(): PolishedSlideProviderAvailability {
    return {
      available: false,
      code: "static_artifact_provider_unavailable",
      message: "Polished image slide generation provider is not configured.",
      remediation:
        "Configure an image generation provider before using polishedImage slide mode.",
    }
  }
}

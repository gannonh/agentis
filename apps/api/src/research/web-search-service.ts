import type { SearchWebInput, SearchWebOutput } from "@workspace/shared"
import {
  isWebSearchProviderAvailable,
  resolveWebSearchProviderName,
  type AppConfig,
} from "../config.js"
import { createMockWebSearchProvider } from "./mock-web-search-provider.js"
import { createTavilyWebSearchProvider } from "./tavily-web-search-provider.js"
import { createVercelGatewayWebSearchProvider } from "./vercel-gateway-web-search-provider.js"
import {
  WebSearchError,
  type WebSearchProvider,
} from "./web-search-provider.js"

export class WebSearchService {
  private provider: WebSearchProvider | null = null

  constructor(private readonly config: AppConfig) {}

  isAvailable(): boolean {
    return isWebSearchProviderAvailable(this.config)
  }

  getProviderName(): string {
    return resolveWebSearchProviderName(this.config)
  }

  resolveProvider(): WebSearchProvider {
    if (this.provider) return this.provider

    if (!this.isAvailable()) {
      throw new WebSearchError(
        "web_search_unavailable",
        "Web search provider is not configured"
      )
    }

    if (this.config.mockRuntime || this.config.webSearchProvider === "mock") {
      this.provider = createMockWebSearchProvider(this.config)
      return this.provider
    }

    if (this.config.webSearchProvider === "tavily") {
      this.provider = createTavilyWebSearchProvider(this.config)
      return this.provider
    }

    this.provider = createVercelGatewayWebSearchProvider(this.config)
    return this.provider
  }

  async search(input: SearchWebInput): Promise<SearchWebOutput> {
    return this.resolveProvider().search(input)
  }
}

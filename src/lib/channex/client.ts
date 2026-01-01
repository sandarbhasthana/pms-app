/**
 * Channex API Client (Single Master Account)
 *
 * Uses ONE master API key from environment variables.
 * All operations for all organizations/properties use this single key.
 */

import { getChannexConfig, CHANNEX_ENDPOINTS } from "./config";
import type {
  ChannexGroup,
  ChannexProperty,
  ChannexRoomType,
  ChannexRatePlan,
  ChannexReservation,
  ChannexChannel,
  CreateGroupPayload,
  CreatePropertyPayload,
  CreateRoomTypePayload,
  CreateRatePlanPayload,
  ARIUpdatePayload,
  ReservationQueryParams,
  ChannexListResponse,
  ChannexApiResponse
} from "./types";

interface ChannexClientConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
  debug: boolean;
}

/**
 * Custom error class for Channex API errors
 */
export class ChannexApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ChannexApiError";
  }
}

/**
 * Channex API Client
 * Singleton pattern - always uses master API key from environment
 */
export class ChannexClient {
  private config: ChannexClientConfig;
  private static instance: ChannexClient | null = null;

  /**
   * Private constructor - use getInstance() instead
   * API key ALWAYS comes from environment variable (Option A)
   */
  private constructor() {
    const envConfig = getChannexConfig();
    this.config = {
      apiUrl: envConfig.apiUrl,
      apiKey: envConfig.apiKey,
      timeout: 30000,
      debug: envConfig.debug
    };
  }

  /**
   * Get singleton instance of the client
   */
  static getInstance(): ChannexClient {
    if (!ChannexClient.instance) {
      ChannexClient.instance = new ChannexClient();
    }
    return ChannexClient.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    ChannexClient.instance = null;
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[Channex] ${message}`, data ?? "");
    }
  }

  /**
   * Make an authenticated request to the Channex API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;

    this.log(`${options.method || "GET"} ${endpoint}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "user-api-key": this.config.apiKey,
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.log(`Error ${response.status}:`, error);
        throw new ChannexApiError(
          error.message || error.error || `HTTP ${response.status}`,
          response.status,
          error
        );
      }

      const data = await response.json();
      this.log("Response:", data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ChannexApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ChannexApiError("Request timeout", 408);
      }
      throw new ChannexApiError(
        error instanceof Error ? error.message : "Unknown error",
        500
      );
    }
  }

  // ============================================
  // Groups (for Organizations)
  // ============================================

  async createGroup(data: CreateGroupPayload): Promise<ChannexGroup> {
    const response = await this.request<ChannexApiResponse<ChannexGroup>>(
      CHANNEX_ENDPOINTS.groups,
      {
        method: "POST",
        body: JSON.stringify({ group: data })
      }
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  async getGroups(): Promise<ChannexGroup[]> {
    const response = await this.request<ChannexListResponse<ChannexGroup>>(
      CHANNEX_ENDPOINTS.groups
    );
    return response.data.map((item) => ({ ...item.attributes, id: item.id }));
  }

  async getGroup(groupId: string): Promise<ChannexGroup> {
    const response = await this.request<ChannexApiResponse<ChannexGroup>>(
      CHANNEX_ENDPOINTS.group(groupId)
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  /**
   * Associate a property with a group
   */
  async addPropertyToGroup(groupId: string, propertyId: string): Promise<void> {
    await this.request(CHANNEX_ENDPOINTS.groupProperties(groupId, propertyId), {
      method: "POST"
    });
  }

  // ============================================
  // Properties
  // ============================================

  async createProperty(data: CreatePropertyPayload): Promise<ChannexProperty> {
    const response = await this.request<ChannexApiResponse<ChannexProperty>>(
      CHANNEX_ENDPOINTS.properties,
      {
        method: "POST",
        body: JSON.stringify({ property: data })
      }
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  async getProperties(): Promise<ChannexProperty[]> {
    const response = await this.request<ChannexListResponse<ChannexProperty>>(
      CHANNEX_ENDPOINTS.properties
    );
    return response.data.map((item) => ({ ...item.attributes, id: item.id }));
  }

  async getProperty(propertyId: string): Promise<ChannexProperty> {
    const response = await this.request<ChannexApiResponse<ChannexProperty>>(
      CHANNEX_ENDPOINTS.property(propertyId)
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  // ============================================
  // Room Types
  // ============================================

  async createRoomType(data: CreateRoomTypePayload): Promise<ChannexRoomType> {
    const response = await this.request<ChannexApiResponse<ChannexRoomType>>(
      CHANNEX_ENDPOINTS.roomTypes,
      {
        method: "POST",
        body: JSON.stringify({ room_type: data })
      }
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  async getRoomTypes(propertyId?: string): Promise<ChannexRoomType[]> {
    const endpoint = propertyId
      ? `${CHANNEX_ENDPOINTS.roomTypes}?filter[property_id]=${propertyId}`
      : CHANNEX_ENDPOINTS.roomTypes;
    const response = await this.request<ChannexListResponse<ChannexRoomType>>(
      endpoint
    );
    return response.data.map((item) => ({ ...item.attributes, id: item.id }));
  }

  async getRoomType(roomTypeId: string): Promise<ChannexRoomType> {
    const response = await this.request<ChannexApiResponse<ChannexRoomType>>(
      CHANNEX_ENDPOINTS.roomType(roomTypeId)
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  // ============================================
  // Rate Plans
  // ============================================

  async createRatePlan(data: CreateRatePlanPayload): Promise<ChannexRatePlan> {
    const response = await this.request<ChannexApiResponse<ChannexRatePlan>>(
      CHANNEX_ENDPOINTS.ratePlans,
      {
        method: "POST",
        body: JSON.stringify({ rate_plan: data })
      }
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  async getRatePlans(propertyId?: string): Promise<ChannexRatePlan[]> {
    const endpoint = propertyId
      ? `${CHANNEX_ENDPOINTS.ratePlans}?filter[property_id]=${propertyId}`
      : CHANNEX_ENDPOINTS.ratePlans;
    const response = await this.request<ChannexListResponse<ChannexRatePlan>>(
      endpoint
    );
    return response.data.map((item) => ({ ...item.attributes, id: item.id }));
  }

  // ============================================
  // ARI (Availability, Rates, Inventory)
  // ============================================

  async updateARI(data: ARIUpdatePayload): Promise<void> {
    await this.request(CHANNEX_ENDPOINTS.ari, {
      method: "POST",
      body: JSON.stringify({ values: data })
    });
  }

  async bulkUpdateARI(updates: ARIUpdatePayload[]): Promise<void> {
    // Channex API may have batch limits, process in chunks
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await this.request(CHANNEX_ENDPOINTS.ari, {
        method: "POST",
        body: JSON.stringify({ values: batch })
      });
    }
  }

  // ============================================
  // Reservations/Bookings
  // ============================================

  async getReservations(
    params?: ReservationQueryParams
  ): Promise<ChannexReservation[]> {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.set("filter[date_from]", params.from);
    if (params?.to) queryParams.set("filter[date_to]", params.to);
    if (params?.status) queryParams.set("filter[status]", params.status);
    if (params?.channel) queryParams.set("filter[channel]", params.channel);
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${CHANNEX_ENDPOINTS.bookings}?${queryString}`
      : CHANNEX_ENDPOINTS.bookings;

    const response = await this.request<
      ChannexListResponse<ChannexReservation>
    >(endpoint);
    return response.data.map((item) => ({ ...item.attributes, id: item.id }));
  }

  async getReservation(bookingId: string): Promise<ChannexReservation> {
    const response = await this.request<ChannexApiResponse<ChannexReservation>>(
      CHANNEX_ENDPOINTS.booking(bookingId)
    );
    return { ...response.data.attributes, id: response.data.id };
  }

  // ============================================
  // Channels
  // ============================================

  async getChannels(propertyId?: string): Promise<ChannexChannel[]> {
    const endpoint = propertyId
      ? `${CHANNEX_ENDPOINTS.channels}?filter[property_id]=${propertyId}`
      : CHANNEX_ENDPOINTS.channels;
    const response = await this.request<ChannexListResponse<ChannexChannel>>(
      endpoint
    );
    return response.data.map((item) => ({ ...item.attributes, id: item.id }));
  }

  // ============================================
  // Webhooks
  // ============================================

  async registerWebhook(
    url: string,
    events: string[],
    headers?: Record<string, string>
  ): Promise<{ id: string }> {
    const response = await this.request<ChannexApiResponse<{ id: string }>>(
      CHANNEX_ENDPOINTS.webhooks,
      {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            url,
            events,
            headers
          }
        })
      }
    );
    return { id: response.data.id };
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(CHANNEX_ENDPOINTS.webhook(webhookId), {
      method: "DELETE"
    });
  }
}

/**
 * Get the Channex client singleton instance
 * Convenience function for importing
 */
export function getChannexClient(): ChannexClient {
  return ChannexClient.getInstance();
}

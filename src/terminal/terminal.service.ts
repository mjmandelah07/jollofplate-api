import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TerminalJson = Record<string, unknown>;

const LIVE_BASE = 'https://api.terminal.africa/v1';
const TEST_BASE = 'https://sandbox.terminal.africa/v1';

export type TerminalAddressInput = {
  city: string;
  state: string;
  country: string;
  zip: string;
  line1: string;
  line2?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  name?: string;
  is_residential?: boolean;
};

export type TerminalParcelItemInput = {
  description: string;
  name: string;
  type?: string;
  currency?: string;
  value: number;
  quantity: number;
  weight: number;
};

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string | undefined;
  private readonly publicKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('TERMINAL_SECRET_KEY')?.trim();
    this.publicKey = this.config.get<string>('TERMINAL_PUBLIC_KEY')?.trim();

    const configuredBase = this.config.get<string>('TERMINAL_BASE_URL')?.trim();
    this.baseUrl = (
      configuredBase ||
      (this.secretKey?.startsWith('sk_test_') ? TEST_BASE : LIVE_BASE)
    ).replace(/\/$/, '');

    if (this.secretKey) {
      this.logger.log(
        `Terminal Africa configured (${this.isTestMode() ? 'test/sandbox' : 'live'} → ${this.baseUrl})`,
      );
    } else {
      this.logger.warn('TERMINAL_SECRET_KEY not set — shipping API disabled');
    }
  }

  isConfigured() {
    return Boolean(this.secretKey);
  }

  isTestMode() {
    return Boolean(this.secretKey?.startsWith('sk_test_'));
  }

  async getConnectionStatus() {
    if (!this.secretKey) {
      return {
        configured: false,
        mode: null,
        baseUrl: null,
        ok: false,
        message: 'TERMINAL_SECRET_KEY is not set',
      };
    }

    try {
      const carriers = await this.request<TerminalJson>(
        'GET',
        '/carriers?perPage=1&active=true',
      );
      const data =
        carriers.data && typeof carriers.data === 'object'
          ? (carriers.data as TerminalJson)
          : {};
      const list = Array.isArray(data.carriers) ? data.carriers : [];

      return {
        configured: true,
        mode: this.isTestMode() ? 'test' : 'live',
        baseUrl: this.baseUrl,
        ok: true,
        message: 'Connected to Terminal Africa',
        publicKeyPrefix: this.publicKey
          ? `${this.publicKey.slice(0, 10)}…`
          : null,
        carriersSample: list.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Terminal connection failed';
      this.logger.error(`Terminal connection check failed: ${message}`);
      return {
        configured: true,
        mode: this.isTestMode() ? 'test' : 'live',
        baseUrl: this.baseUrl,
        ok: false,
        message,
      };
    }
  }

  async listActiveCarriers(page = 1, limit = 20) {
    const raw = await this.request<TerminalJson>(
      'GET',
      `/carriers?active=true&page=${page}&perPage=${limit}`,
    );
    return this.normalizePagedList(raw, 'carriers', page, limit);
  }

  async listPackaging(page = 1, limit = 20) {
    const raw = await this.request<TerminalJson>(
      'GET',
      `/packaging?page=${page}&perPage=${limit}`,
    );
    return this.normalizePagedList(raw, 'packaging', page, limit);
  }

  /**
   * Live rates for checkout. persist_data=true so rate_id can book later.
   * Terminal requires line2 — we send "N/A" when missing.
   */
  async getShipmentQuotes(params: {
    pickup: TerminalAddressInput;
    delivery: TerminalAddressInput;
    items: TerminalParcelItemInput[];
    packagingId?: string | null;
    currency?: string;
  }) {
    const payload = {
      currency: params.currency ?? 'NGN',
      persist_data: true,
      pickup_address: this.normalizeAddress(params.pickup, false),
      delivery_address: this.normalizeAddress(params.delivery, true),
      parcel: {
        description: 'JollofPlate food order',
        weight_unit: 'kg',
        ...(params.packagingId
          ? { packaging_id: params.packagingId }
          : {}),
        items: params.items.map((item) => ({
          description: item.description,
          name: item.name,
          type: item.type ?? 'parcel',
          currency: item.currency ?? 'NGN',
          value: item.value,
          quantity: item.quantity,
          weight: item.weight,
        })),
      },
    };

    return this.request<TerminalJson>(
      'POST',
      '/rates/shipment/quotes',
      payload,
    );
  }

  async getRate(rateId: string) {
    return this.request<TerminalJson>('GET', `/rates/${rateId}`);
  }

  async createShipment(params: {
    pickupAddressId: string;
    deliveryAddressId: string;
    parcelId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request<TerminalJson>('POST', '/shipments', {
      address_from: params.pickupAddressId,
      address_to: params.deliveryAddressId,
      parcel: params.parcelId,
      shipment_purpose: 'commercial',
      metadata: params.metadata ?? {},
    });
  }

  /** Charge wallet / arrange carrier pickup for an existing shipment + rate */
  async arrangePickup(params: { shipmentId: string; rateId: string }) {
    return this.request<TerminalJson>('POST', '/shipments/pickup', {
      shipment_id: params.shipmentId,
      rate_id: params.rateId,
    });
  }

  async request<T = TerminalJson>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    this.requireSecret();

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let json: TerminalJson | null = null;
    if (text) {
      try {
        json = JSON.parse(text) as TerminalJson;
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const detail =
        (json && typeof json.message === 'string' && json.message) ||
        (json && typeof json.error === 'string' && json.error) ||
        text.slice(0, 200) ||
        response.statusText;
      const label = `Terminal Africa ${method} ${path} failed (${response.status}): ${detail}`;
      // Validation problems (bad phone/address) → 400; real outages → 503
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(label);
      }
      throw new ServiceUnavailableException(label);
    }

    return (json ?? {}) as T;
  }

  private normalizeAddress(
    address: TerminalAddressInput,
    residential: boolean,
  ) {
    const country = this.normalizeCountry(address.country);
    return {
      city: address.city.trim(),
      state: address.state.trim(),
      country,
      zip: address.zip.trim() || '100001',
      line1: address.line1.trim(),
      line2: address.line2?.trim() || 'N/A',
      first_name: address.first_name.trim(),
      last_name: address.last_name.trim(),
      phone: this.normalizePhone(address.phone, country),
      email: address.email?.trim() || undefined,
      name:
        address.name?.trim() ||
        `${address.first_name.trim()} ${address.last_name.trim()}`.trim(),
      is_residential: address.is_residential ?? residential,
    };
  }

  /** Terminal wants ISO-2 (NG), not "Nigeria". */
  private normalizeCountry(country?: string) {
    const raw = (country || 'NG').trim();
    const upper = raw.toUpperCase();
    const aliases: Record<string, string> = {
      NIGERIA: 'NG',
      'UNITED KINGDOM': 'GB',
      UK: 'GB',
      'UNITED STATES': 'US',
      USA: 'US',
      GHANA: 'GH',
      KENYA: 'KE',
    };
    if (aliases[upper]) {
      return aliases[upper];
    }
    if (upper.length === 2) {
      return upper;
    }
    return 'NG';
  }

  /**
   * Terminal requires phone country code to match address country.
   * For NG → E.164 like +2348012345678 (no leading 0 after 234).
   */
  private normalizePhone(phone: string, country = 'NG') {
    const trimmed = phone.trim().replace(/[\s\-()]/g, '');
    if (!trimmed) {
      return trimmed;
    }

    if (country === 'NG') {
      let digits = trimmed.replace(/^\+/, '');
      if (digits.startsWith('234')) {
        digits = digits.slice(3);
      }
      // local numbers often start with 0
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      return `+234${digits}`;
    }

    if (trimmed.startsWith('+')) {
      return trimmed;
    }
    return `+${trimmed}`;
  }

  private requireSecret() {
    if (!this.secretKey) {
      throw new ServiceUnavailableException(
        'Terminal Africa is not configured (missing TERMINAL_SECRET_KEY)',
      );
    }
  }

  private normalizePagedList(
    raw: TerminalJson,
    listKey: string,
    fallbackPage: number,
    fallbackLimit: number,
  ) {
    const data =
      raw.data && typeof raw.data === 'object'
        ? (raw.data as TerminalJson)
        : {};
    const items = Array.isArray(data[listKey])
      ? (data[listKey] as unknown[])
      : [];
    const pagination =
      data.pagination && typeof data.pagination === 'object'
        ? (data.pagination as TerminalJson)
        : {};

    const page =
      typeof pagination.currentPage === 'number'
        ? pagination.currentPage
        : typeof pagination.page === 'number'
          ? pagination.page
          : fallbackPage;
    const limit =
      typeof pagination.perPage === 'number'
        ? pagination.perPage
        : fallbackLimit;
    const total =
      typeof pagination.total === 'number' ? pagination.total : items.length;
    const totalPages =
      typeof pagination.pageCount === 'number'
        ? pagination.pageCount
        : Math.ceil(total / limit) || 1;

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: Boolean(pagination.hasNextPage),
        hasPrevPage: Boolean(pagination.hasPrevPage),
      },
      message: typeof raw.message === 'string' ? raw.message : undefined,
    };
  }
}

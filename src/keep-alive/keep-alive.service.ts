import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly urls: string[];

  constructor(private readonly config: ConfigService) {
    const raw =
      this.config.get<string>('KEEP_ALIVE_URLS') ??
      this.config.get<string>('KEEP_ALIVE_URL') ??
      '';
    this.urls = raw
      .split(',')
      .map((url) => url.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  onModuleInit() {
    if (this.urls.length === 0) {
      this.logger.log(
        'Keep-alive idle (set KEEP_ALIVE_URLS to enable in-process pings)',
      );
      return;
    }
    this.logger.log(
      `Keep-alive enabled for ${this.urls.length} URL(s), every 5 minutes`,
    );
    // First ping shortly after boot so cold starts recover peers quickly.
    void this.pingAll();
  }

  /** Every 5 minutes — Render free tier sleeps after ~15m idle. */
  @Interval(5 * 60 * 1000)
  async handleInterval() {
    if (this.urls.length === 0) {
      return;
    }
    await this.pingAll();
  }

  private async pingAll() {
    for (const base of this.urls) {
      await this.pingOne(base);
    }
  }

  private async pingOne(base: string) {
    for (const path of ['/health', '/'] as const) {
      const target = `${base}${path}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45_000);
        const res = await fetch(target, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timer);
        if (res.ok) {
          this.logger.log(`Keep-alive OK ${target} (${res.status})`);
          return;
        }
        this.logger.warn(`Keep-alive miss ${target} (${res.status})`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Keep-alive miss ${target}: ${message}`);
      }
    }
    this.logger.error(`Keep-alive FAIL ${base}`);
  }
}

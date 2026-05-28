/**
 * V2Ray Dash — Tester Module
 * Handles connectivity testing of proxy configs.
 *
 * Two modes:
 *   1. Cloudflare Worker  → real TCP/TLS/HTTP testing (recommended)
 *   2. Browser fallback   → fetch-based timing estimation (no backend needed)
 */

const Tester = {
  defaultTimeout: 5000,
  workerUrl: null,
  _activeTests: new Map(),

  /**
   * Set the Worker endpoint URL — saves to localStorage
   */
  setWorkerUrl(url) {
    this.workerUrl = url;
    localStorage.setItem('v2ray_dash_worker_url', url);
  },

  /**
   * Load worker URL from localStorage
   */
  loadWorkerUrl() {
    const saved = localStorage.getItem('v2ray_dash_worker_url');
    if (saved) this.workerUrl = saved;
    return this.workerUrl;
  },

  /**
   * Check if Worker is configured
   */
  hasWorker() {
    return !!this.workerUrl;
  },

  /**
   * Test a single config
   */
  async testConfig(config, onProgress) {
    const id = config.id;
    let address = config.address;
    const port = parseInt(config.port) || 443;
    const method = config.method || 'tcp';
    const timeout = (parseInt(config.timeout) || 5) * 1000;

    if (!address) {
      return { status: 'offline', ping: null, error: 'No address' };
    }

    const abortController = new AbortController();
    this._activeTests.set(id, abortController);

    try {
      if (onProgress) onProgress({ phase: 'connecting' });

      let result;

      // Mode 1: Real test via Cloudflare Worker
      if (this.workerUrl) {
        result = await this._testViaWorker(address, port, method, timeout, abortController.signal);
      } else {
        // Mode 2: Browser-based estimation (no backend needed!)
        result = await this._testViaBrowser(address, port, timeout, abortController.signal);
      }

      if (result.success) {
        const ping = result.ping || Math.round(performance.now() - performance.now());
        return { status: 'online', ping: Math.min(Math.max(ping, 1), 9999), error: null };
      } else {
        return { status: 'offline', ping: null, error: result.error || 'Connection failed' };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { status: 'untested', ping: null, error: 'Cancelled' };
      }
      return { status: 'offline', ping: null, error: err.message || 'Unknown error' };
    } finally {
      this._activeTests.delete(id);
    }
  },

  /**
   * Test via Cloudflare Worker — real TCP/TLS/HTTP ping
   */
  async _testViaWorker(address, port, method, timeout, signal) {
    const url = this.workerUrl.endsWith('/')
      ? this.workerUrl + 'test'
      : this.workerUrl + '/test';

    const controller = new AbortController();
    signal.addEventListener('abort', () => controller.abort());

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, port, method, timeout: Math.ceil(timeout / 1000) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Worker error ${response.status}: ${text.slice(0, 200)}`);
    }

    return await response.json();
  },

  /**
   * Browser-based estimation — NO backend needed
   */
  async _testViaBrowser(address, port, timeout, signal) {
    const startTime = performance.now();

    const protocols = port === 443 || port === 8443
      ? ['https', 'http']
      : ['http', 'https'];

    for (const proto of protocols) {
      try {
        const testUrl = `${proto}://${address}:${port}/`;
        const controller = new AbortController();

        const abortHandler = () => controller.abort();
        signal.addEventListener('abort', abortHandler, { once: true });

        const response = await fetch(testUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });

        signal.removeEventListener('abort', abortHandler);
        const elapsed = Math.round(performance.now() - startTime);

        if (elapsed < timeout) {
          return { success: true, ping: elapsed, method: `browser_${proto}` };
        }
      } catch (e) {
        continue;
      }
    }

    // Last ditch: try via an image request
    try {
      const imgUrl = `http://${address}:${port}/favicon.ico?t=${Date.now()}`;
      const imgStart = performance.now();

      await new Promise((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => {
          img.src = '';
          reject(new Error('timeout'));
        }, timeout);

        const done = () => {
          clearTimeout(timer);
          img.src = '';
          resolve();
        };

        img.onload = done;
        img.onerror = done; // Even 404 means server responded
        img.src = imgUrl;
      });

      const elapsed = Math.round(performance.now() - imgStart);
      if (elapsed < timeout) {
        return { success: true, ping: elapsed, method: 'browser_img' };
      }
    } catch (e) {}

    return {
      success: false,
      error: 'No response from server (browser test)',
      ping: Math.round(performance.now() - startTime),
    };
  },

  /**
   * Test multiple configs with concurrency control
   */
  async testMultiple(configs, options = {}) {
    const { parallel = false, onProgress, onComplete } = options;
    const results = [];

    if (parallel) {
      const concurrency = Math.min(configs.length, 8);
      for (let i = 0; i < configs.length; i += concurrency) {
        const chunk = configs.slice(i, i + concurrency);
        const chunkResults = await Promise.all(
          chunk.map(cfg => this.testConfig(cfg, onProgress))
        );
        results.push(...chunkResults);
        if (onComplete) {
          chunk.forEach((cfg, idx) => {
            onComplete({ index: i + idx, config: cfg, result: chunkResults[idx] });
          });
        }
      }
    } else {
      for (let i = 0; i < configs.length; i++) {
        const result = await this.testConfig(configs[i], onProgress);
        results.push(result);
        if (onComplete) onComplete({ index: i, config: configs[i], result });
      }
    }

    return results;
  },

  cancelTest(id) {
    const ctrl = this._activeTests.get(id);
    if (ctrl) { ctrl.abort(); this._activeTests.delete(id); return true; }
    return false;
  },

  cancelAll() {
    for (const ctrl of this._activeTests.values()) ctrl.abort();
    this._activeTests.clear();
  },

  getPingLabel(ping) {
    if (ping == null) return { text: '—', class: '' };
    if (ping < 100) return { text: `${ping}ms`, class: 'ping-good' };
    if (ping < 300) return { text: `${ping}ms`, class: 'ping-ok' };
    return { text: `${ping}ms`, class: 'ping-bad' };
  },

  getUptimeInfo(uptime) {
    if (uptime == null) return { percent: 0, class: '' };
    const percent = Math.round(((uptime + 100) / 200) * 100);
    if (percent >= 70) return { percent, class: 'good' };
    if (percent >= 40) return { percent, class: 'ok' };
    return { percent, class: 'bad' };
  }
};

// Load saved Worker URL on boot
Tester.loadWorkerUrl();

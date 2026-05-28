/**
 * V2Ray Dash — Config Management Module
 * Handles parsing, storage, and management of V2Ray configs.
 */

const ConfigManager = {
  storageKey: 'v2ray_dash_configs',
  subsKey: 'v2ray_dash_subs',
  configs: [],
  subscriptions: [],

  /**
   * Initialize — load from localStorage
   */
  init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.configs = JSON.parse(saved);
      } catch (e) {
        this.configs = [];
      }
    }
    const subsSaved = localStorage.getItem(this.subsKey);
    if (subsSaved) {
      try {
        this.subscriptions = JSON.parse(subsSaved);
      } catch (e) {
        this.subscriptions = [];
      }
    }
    // Ensure each config has an id
    this.configs = this.configs.map(c => ({
      ...c,
      id: c.id || this._generateId(),
      status: c.status || 'untested',
      ping: c.ping || null,
      uptime: c.uptime || 0,
      testHistory: c.testHistory || [],
      addedAt: c.addedAt || Date.now()
    }));
    this._persist();
  },

  /**
   * Generate a unique ID
   */
  _generateId() {
    return 'cfg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  },

  /**
   * Save to localStorage
   */
  _persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.configs));
    localStorage.setItem(this.subsKey, JSON.stringify(this.subscriptions));
  },

  /**
   * Get all configs
   */
  getAll() {
    return this.configs;
  },

  /**
   * Get config by ID
   */
  getById(id) {
    return this.configs.find(c => c.id === id);
  },

  /**
   * Add a single config
   */
  add(config) {
    const entry = {
      id: this._generateId(),
      name: config.name || '',
      address: config.address || '',
      port: config.port || '',
      protocol: config.protocol || 'auto',
      link: config.link || '',
      method: config.method || 'tcp',
      timeout: config.timeout || 5,
      status: 'untested',
      ping: null,
      uptime: 0,
      testHistory: [],
      addedAt: Date.now(),
      subSource: config.subSource || null
    };
    this.configs.push(entry);
    this._persist();
    return entry;
  },

  /**
   * Add multiple configs at once
   */
  addMultiple(configs) {
    const added = [];
    for (const cfg of configs) {
      added.push(this.add(cfg));
    }
    return added;
  },

  /**
   * Remove config by ID
   */
  remove(id) {
    this.configs = this.configs.filter(c => c.id !== id);
    this._persist();
  },

  /**
   * Remove multiple configs
   */
  removeMultiple(ids) {
    const idSet = new Set(ids);
    this.configs = this.configs.filter(c => !idSet.has(c.id));
    this._persist();
  },

  /**
   * Clear all configs
   */
  clearAll() {
    this.configs = [];
    this._persist();
  },

  /**
   * Update config fields
   */
  update(id, fields) {
    const idx = this.configs.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.configs[idx] = { ...this.configs[idx], ...fields };
    this._persist();
    return this.configs[idx];
  },

  /**
   * Update test result for a config
   */
  updateTestResult(id, result) {
    const idx = this.configs.findIndex(c => c.id === id);
    if (idx === -1) return;
    const cfg = this.configs[idx];
    cfg.status = result.status || cfg.status;
    cfg.ping = result.ping != null ? result.ping : cfg.ping;
    cfg.lastTested = Date.now();
    cfg.lastError = result.error || null;
    // Track uptime: count successful tests
    if (result.status === 'online') {
      cfg.uptime = Math.min((cfg.uptime || 0) + 1, 100);
    } else if (result.status === 'offline') {
      cfg.uptime = Math.max((cfg.uptime || 0) - 1, -100);
    }
    // Keep test history (last 20)
    cfg.testHistory = (cfg.testHistory || []).slice(-19);
    cfg.testHistory.push({
      status: result.status,
      ping: result.ping,
      timestamp: Date.now(),
      error: result.error || null
    });
    this._persist();
  },

  /**
   * Get subscription by URL
   */
  getSubByUrl(url) {
    return this.subscriptions.find(s => s.url === url);
  },

  /**
   * Add or update a subscription
   */
  addSubscription(sub) {
    const existing = this.getSubByUrl(sub.url);
    if (existing) {
      Object.assign(existing, sub);
    } else {
      this.subscriptions.push({
        url: sub.url,
        name: sub.name || sub.url,
        lastFetched: null,
        configIds: [],
        ...sub
      });
    }
    this._persist();
  },

  /**
   * Remove subscription
   */
  removeSubscription(url) {
    this.subscriptions = this.subscriptions.filter(s => s.url !== url);
    // Remove configIds associated with this sub
    this.configs = this.configs.filter(c => c.subSource !== url);
    this._persist();
  },

  /**
   * Parse a subscription response (base64 encoded or plain)
   */
  parseSubscriptionResponse(text) {
    let decoded = text;
    // Try base64 decode
    try {
      const test = atob(text.trim());
      // Check if decoded looks like config links
      if (test.includes('://')) {
        decoded = test;
      }
    } catch (e) {
      // Not base64, use as-is
    }
    // Split by newline
    const lines = decoded.split('\n').map(l => l.trim()).filter(l => l);
    const configs = [];
    for (const line of lines) {
      const parsed = this.parseConfigLink(line);
      if (parsed) {
        configs.push({ ...parsed, link: line });
      }
    }
    return configs;
  },

  /**
   * Parse a single config link (vmess://, vless://, trojan://, ss://)
   */
  parseConfigLink(link) {
    if (!link || typeof link !== 'string') return null;

    try {
      // vmess:// (base64 encoded JSON)
      if (link.startsWith('vmess://')) {
        const b64 = link.slice(8).split('#')[0];
        const jsonStr = atob(b64);
        const data = JSON.parse(jsonStr);
        return {
          name: data.ps || data.remarks || data.name || '',
          address: data.add || data.host || data.server || '',
          port: String(data.port || ''),
          protocol: 'vmess',
          link: link
        };
      }

      // vless://
      if (link.startsWith('vless://')) {
        const rest = link.slice(8);
        const parts = rest.split('@');
        if (parts.length < 2) return null;
        const addressPart = parts[1].split('?')[0].split('#')[0];
        const addrPort = addressPart.split(':');
        const hashPart = rest.includes('#') ? rest.split('#')[1].split('?')[0] : '';
        return {
          name: decodeURIComponent(hashPart || '') || '',
          address: addrPort[0] || '',
          port: addrPort[1] || '',
          protocol: 'vless',
          link: link
        };
      }

      // trojan://
      if (link.startsWith('trojan://')) {
        const rest = link.slice(9);
        const hashPart = rest.includes('#') ? rest.split('#')[1].split('?')[0] : '';
        const atPart = rest.split('@');
        const addrPart = atPart.length > 1 ? atPart[1].split('?')[0].split('#')[0] : rest.split('?')[0].split('#')[0];
        const addrPort = addrPart.split(':');
        return {
          name: decodeURIComponent(hashPart || '') || '',
          address: addrPort[0] || '',
          port: addrPort[1] || '',
          protocol: 'trojan',
          link: link
        };
      }

      // ss:// (Shadowsocks)
      if (link.startsWith('ss://')) {
        const rest = link.slice(5);
        const hashPart = rest.includes('#') ? rest.split('#')[1].split('?')[0] : '';
        // Try SIP002 format: ss://base64(method:pass)@host:port
        const atParts = rest.split('@');
        let address = '', port = '';
        if (atParts.length > 1) {
          const addrPort = atParts[1].split('?')[0].split('#')[0].split(':');
          address = addrPort[0] || '';
          port = addrPort[1] || '';
        }
        return {
          name: decodeURIComponent(hashPart || '') || '',
          address,
          port,
          protocol: 'shadowsocks',
          link: link
        };
      }
    } catch (e) {
      // Parse failed, return basic info
    }

    // Fallback: try to extract host:port from any link
    try {
      const url = new URL(link);
      return {
        name: link.split('#').pop() || '',
        address: url.hostname || '',
        port: url.port || '',
        protocol: url.protocol.replace(':', ''),
        link: link
      };
    } catch (e) {
      return null;
    }
  },

  /**
   * Export all configs as JSON
   */
  exportJSON() {
    return JSON.stringify({ configs: this.configs, subscriptions: this.subscriptions }, null, 2);
  },

  /**
   * Import configs from JSON
   */
  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.configs && Array.isArray(data.configs)) {
        this.configs = data.configs.map(c => ({
          ...c,
          id: c.id || this._generateId()
        }));
      }
      if (data.subscriptions && Array.isArray(data.subscriptions)) {
        this.subscriptions = data.subscriptions;
      }
      this._persist();
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Get statistics
   */
  getStats() {
    const total = this.configs.length;
    let online = 0, offline = 0, untested = 0;
    let totalPing = 0, pingCount = 0;
    for (const c of this.configs) {
      if (c.status === 'online') { online++; totalPing += c.ping || 0; pingCount++; }
      else if (c.status === 'offline') offline++;
      else untested++;
    }
    return {
      total,
      online,
      offline,
      untested,
      avgPing: pingCount > 0 ? Math.round(totalPing / pingCount) : null
    };
  }
};

// Initialize on load
ConfigManager.init();

/**
 * V2Ray Dash — Main Application Controller
 * Ties together ConfigManager, Tester, and the DOM UI.
 */
(function () {
  'use strict';

  // ---- DOM refs ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const configsBody = $('#configsBody');
  const emptyState = $('#emptyState');
  const configCount = $('#configCount');
  const statTotal = $('#statTotal');
  const statOnline = $('#statOnline');
  const statOffline = $('#statOffline');
  const statUntested = $('#statUntested');
  const statAvgPing = $('#statAvgPing');
  const toastContainer = $('#toastContainer');
  const testAllBtn = $('#testAllBtn');
  const clearAllBtn = $('#clearAllBtn');
  const exportBtn = $('#exportBtn');
  const addSingleBtn = $('#addSingleBtn');
  const bulkImportBtn = $('#bulkImportBtn');
  const subFetchBtn = $('#subFetchBtn');
  const themeToggle = $('#themeToggle');
  const langToggle = $('#langToggle');
  const subsSection = $('#subsSection');
  const subsList = $('#subsList');

  // Tab switching
  const tabBtns = $$('.tab-btn');
  const tabContents = $$('.tab-content');

  // ---- State ----
  let currentLang = 'fa';
  let isTestingAll = false;

  const i18n = {
    fa: {
      addConfig: 'افزودن کانفیگ',
      singleConfig: 'تکی',
      bulkImport: 'حجمی',
      subscribe: 'سابسکرایب',
      label: 'برچسب',
      address: 'آدرس',
      port: 'پورت',
      vmessLink: 'لینک کانفیگ (vmess/vless/trojan)',
      protocol: 'پروتکل',
      testMethod: 'روش تست',
      timeout: 'تایم‌اوت (ثانیه)',
      add: 'افزودن',
      pasteConfigs: 'لینک‌های کانفیگ را وارد کنید (هر خط یک لینک)',
      import: 'ورود دسته‌جمعی',
      subUrl: 'آدرس سابسکرایب',
      subName: 'نام سابسکرایب',
      fetch: 'دریافت کانفیگ‌ها',
      subscriptions: 'سابسکرایب‌ها',
      configs: 'کانفیگ‌ها',
      testAll: 'تست همه',
      status: 'وضعیت',
      labelCol: 'برچسب',
      addressCol: 'آدرس',
      portCol: 'پورت',
      protocolCol: 'پروتکل',
      ping: 'پینگ',
      uptime: 'آپتایم',
      actions: 'عملیات',
      noConfigs: 'هنوز کانفیگی اضافه نکردید!',
      noConfigsHint: 'از بخش بالا لینک‌های کانفیگ خود را اضافه کنید',
      total: 'کل',
      online: 'آنلاین',
      offline: 'آفلاین',
      untested: 'تست نشده',
      avgPing: 'میانگین پینگ',
      configAdded: 'کانفیگ با موفقیت اضافه شد',
      configsAdded: 'کانفیگ با موفقیت اضافه شدند',
      configRemoved: 'کانفیگ حذف شد',
      allCleared: 'همه کانفیگ‌ها پاک شدند',
      testingStarted: 'تست همه کانفیگ‌ها شروع شد...',
      testingDone: 'تست همه کانفیگ‌ها به پایان رسید',
      testCancelled: 'تست لغو شد',
      fetchStarted: 'دریافت کانفیگ‌ها از سابسکرایب...',
      fetchDone: 'کانفیگ از سابسکرایب دریافت شدند',
      fetchFailed: 'دریافت از سابسکرایب ناموفق بود',
      exported: 'کانفیگ‌ها با موفقیت خروجی گرفته شدند',
      online_: 'آنلاین',
      offline_: 'آفلاین',
      untested_: 'تست نشده',
      testing_: 'در حال تست...',
      test: 'تست',
      remove: 'حذف',
      copy: 'کپی',
      items: 'کانفیگ',
      noSubUrl: 'لطفاً آدرس سابسکرایب را وارد کنید',
      invalidLink: 'لینک نامعتبر است',
      enterName: 'لطفاً یک نام وارد کنید',
      testSingle: 'تست',
    },
    en: {
      addConfig: 'Add Config',
      singleConfig: 'Single',
      bulkImport: 'Bulk',
      subscribe: 'Subscribe',
      label: 'Label',
      address: 'Address',
      port: 'Port',
      vmessLink: 'Config Link (vmess/vless/trojan)',
      protocol: 'Protocol',
      testMethod: 'Test Method',
      timeout: 'Timeout (sec)',
      add: 'Add',
      pasteConfigs: 'Paste config links (one per line)',
      import: 'Bulk Import',
      subUrl: 'Subscribe URL',
      subName: 'Subscribe Name',
      fetch: 'Fetch Configs',
      subscriptions: 'Subscriptions',
      configs: 'Configs',
      testAll: 'Test All',
      status: 'Status',
      labelCol: 'Label',
      addressCol: 'Address',
      portCol: 'Port',
      protocolCol: 'Protocol',
      ping: 'Ping',
      uptime: 'Uptime',
      actions: 'Actions',
      noConfigs: 'No configs added yet!',
      noConfigsHint: 'Add your config links from the section above',
      total: 'Total',
      online: 'Online',
      offline: 'Offline',
      untested: 'Untested',
      avgPing: 'Avg Ping',
      configAdded: 'Config added successfully',
      configsAdded: 'Configs added successfully',
      configRemoved: 'Config removed',
      allCleared: 'All configs cleared',
      testingStarted: 'Testing all configs...',
      testingDone: 'All tests completed',
      testCancelled: 'Test cancelled',
      fetchStarted: 'Fetching configs from subscription...',
      fetchDone: 'Configs fetched from subscription',
      fetchFailed: 'Failed to fetch from subscription',
      exported: 'Configs exported successfully',
      online_: 'Online',
      offline_: 'Offline',
      untested_: 'Untested',
      testing_: 'Testing...',
      test: 'Test',
      remove: 'Remove',
      copy: 'Copy',
      items: 'configs',
      noSubUrl: 'Please enter a subscribe URL',
      invalidLink: 'Invalid link',
      enterName: 'Please enter a name',
      testSingle: 'Test',
    }
  };

  // ---- i18n helper ----
  function t(key) {
    return i18n[currentLang]?.[key] || i18n['fa'][key] || key;
  }

  // ---- Toast ----
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    toast.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  // ---- Render Config Row ----
  function renderConfigRow(config) {
    const tr = document.createElement('tr');
    tr.dataset.id = config.id;

    const pingInfo = Tester.getPingLabel(config.ping);
    const uptimeInfo = Tester.getUptimeInfo(config.uptime);

    const statusIcon = {
      online: '<i class="fas fa-check-circle"></i>',
      offline: '<i class="fas fa-times-circle"></i>',
      untested: '<i class="fas fa-minus-circle"></i>'
    };

    const protoClassMap = {
      vmess: 'proto-vmess', vless: 'proto-vless',
      trojan: 'proto-trojan', shadowsocks: 'proto-shadowsocks'
    };

    tr.innerHTML = `
      <td class="col-status">
        <div class="status-dot status-${config.status}">
          ${statusIcon[config.status] || statusIcon.untested}
        </div>
      </td>
      <td class="col-name">
        <div class="config-name">${escapeHtml(config.name || '-')}</div>
      </td>
      <td class="col-addr">
        <div class="config-addr">${escapeHtml(config.address || '-')}</div>
      </td>
      <td class="col-port">${config.port || '-'}</td>
      <td class="col-proto">
        <span class="config-proto ${protoClassMap[config.protocol] || ''}">${config.protocol || '?'}</span>
      </td>
      <td class="col-ping">
        <span class="ping-value ${pingInfo.class}">${pingInfo.text}</span>
      </td>
      <td class="col-uptime">
        <div class="uptime-bar">
          <div class="uptime-fill ${uptimeInfo.class}" style="width: ${uptimeInfo.percent}%"></div>
        </div>
      </td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="btn btn-glass btn-sm test-btn" data-id="${config.id}">
            <i class="fas fa-play"></i> ${t('testSingle')}
          </button>
          <button class="btn btn-glass btn-sm copy-btn" data-id="${config.id}" title="${t('copy')}">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn btn-glass btn-sm btn-danger remove-btn" data-id="${config.id}" title="${t('remove')}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    // Event listeners
    tr.querySelector('.test-btn').addEventListener('click', () => testSingle(config.id));
    tr.querySelector('.copy-btn').addEventListener('click', () => copyConfigLink(config.id));
    tr.querySelector('.remove-btn').addEventListener('click', () => removeConfig(config.id));

    return tr;
  }

  // ---- Escape HTML ----
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Render All Configs ----
  function renderAll() {
    const configs = ConfigManager.getAll();
    configsBody.innerHTML = '';

    if (configs.length === 0) {
      emptyState.style.display = 'block';
      configCount.textContent = `۰ ${t('items')}`;
    } else {
      emptyState.style.display = 'none';
      configCount.textContent = `${toPersianNum(configs.length)} ${t('items')}`;
      configs.forEach(cfg => {
        configsBody.appendChild(renderConfigRow(cfg));
      });
    }

    updateStats();
  }

  // ---- Persian Numbers ----
  function toPersianNum(n) {
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/[0-9]/g, d => persian[parseInt(d)]);
  }

  // ---- Update Stats ----
  function updateStats() {
    const stats = ConfigManager.getStats();
    statTotal.textContent = toPersianNum(stats.total);
    statOnline.textContent = toPersianNum(stats.online);
    statOffline.textContent = toPersianNum(stats.offline);
    statUntested.textContent = toPersianNum(stats.untested);
    statAvgPing.textContent = stats.avgPing !== null ? stats.avgPing + 'ms' : '—';
  }

  // ---- Test Single Config ----
  async function testSingle(id) {
    const config = ConfigManager.getById(id);
    if (!config) return;

    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (tr) tr.classList.add('testing');

    // Show spinner in status
    const statusCell = tr?.querySelector('.col-status .status-dot');
    if (statusCell) statusCell.innerHTML = '<span class="spinner"></span>';

    ConfigManager.update(id, { status: 'testing' });
    renderAll();

    const result = await Tester.testConfig(config, (progress) => {
      // Could show progress here
    });

    ConfigManager.updateTestResult(id, result);
    renderAll();

    // Toast based on result
    if (result.status === 'online') {
      showToast(`${config.name || config.address} — ${result.ping}ms ✅`, 'success');
    } else {
      showToast(`${config.name || config.address} — ${t('offline_')} ❌`, 'error');
    }

    if (tr) tr.classList.remove('testing');
  }

  // ---- Test All ----
  async function testAll() {
    const configs = ConfigManager.getAll();
    if (configs.length === 0) {
      showToast(t('noConfigs'), 'warning');
      return;
    }

    if (isTestingAll) {
      Tester.cancelAll();
      isTestingAll = false;
      testAllBtn.innerHTML = `<i class="fas fa-play"></i> ${t('testAll')}`;
      showToast(t('testCancelled'), 'warning');
      return;
    }

    isTestingAll = true;
    testAllBtn.innerHTML = '<span class="spinner-wrap"><span class="spinner"></span> توقف</span>';
    testAllBtn.classList.add('btn-warning');
    showToast(t('testingStarted'), 'info');

    // Set all to testing
    configs.forEach(c => ConfigManager.update(c.id, { status: 'testing' }));
    renderAll();

    await Tester.testMultiple(configs, {
      parallel: true,
      onComplete: ({ index, config, result }) => {
        ConfigManager.updateTestResult(config.id, result);
        renderAll();
      }
    });

    isTestingAll = false;
    testAllBtn.innerHTML = `<i class="fas fa-play"></i> ${t('testAll')}`;
    testAllBtn.classList.remove('btn-warning');
    showToast(t('testingDone'), 'success');
  }

  // ---- Copy Config Link ----
  function copyConfigLink(id) {
    const config = ConfigManager.getById(id);
    if (!config || !config.link) return;
    navigator.clipboard.writeText(config.link)
      .then(() => showToast('✅ ' + t('copy'), 'success'))
      .catch(() => showToast('⚠️ Copy failed', 'error'));
  }

  // ---- Remove Config ----
  function removeConfig(id) {
    ConfigManager.remove(id);
    renderAll();
    showToast(t('configRemoved'), 'info');
  }

  // ---- Clear All ----
  function clearAll() {
    if (ConfigManager.getAll().length === 0) return;
    if (!confirm(currentLang === 'fa' ? 'همه کانفیگ‌ها پاک شوند؟' : 'Clear all configs?')) return;
    ConfigManager.clearAll();
    renderAll();
    showToast(t('allCleared'), 'info');
  }

  // ---- Add Single Config ----
  function addSingle() {
    const name = $('#configName').value.trim();
    const address = $('#configAddress').value.trim();
    const port = $('#configPort').value.trim();
    const link = $('#configLink').value.trim();
    const protocol = $('#configProtocol').value;
    const method = $('#testMethod').value;
    const timeout = parseInt($('#configTimeout').value) || 5;

    if (!link && (!address || !port)) {
      showToast(t('invalidLink'), 'error');
      return;
    }

    let parsed = link ? ConfigManager.parseConfigLink(link) : null;
    const configData = {
      name: name || parsed?.name || '',
      address: address || parsed?.address || '',
      port: port || parsed?.port || '',
      protocol: protocol === 'auto' ? (parsed?.protocol || 'unknown') : protocol,
      link: link || '',
      method,
      timeout
    };

    if (!configData.address) {
      showToast(t('invalidLink'), 'error');
      return;
    }

    ConfigManager.add(configData);
    renderAll();

    // Clear inputs
    $('#configName').value = '';
    $('#configAddress').value = '';
    $('#configPort').value = '';
    $('#configLink').value = '';

    showToast(t('configAdded'), 'success');
  }

  // ---- Bulk Import ----
  function bulkImport() {
    const text = $('#bulkTextarea').value.trim();
    if (!text) {
      showToast(t('invalidLink'), 'error');
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let added = 0;

    for (const line of lines) {
      const parsed = ConfigManager.parseConfigLink(line);
      if (parsed) {
        ConfigManager.add({ ...parsed, link: line, method: 'tcp', timeout: 5 });
        added++;
      }
    }

    if (added > 0) {
      $('#bulkTextarea').value = '';
      renderAll();
      showToast(`${added} ${t('configsAdded')}`, 'success');
    } else {
      showToast(t('invalidLink'), 'error');
    }
  }

  // ---- Fetch Subscription ----
  async function fetchSubscription() {
    const url = $('#subUrl').value.trim();
    const name = $('#subName').value.trim() || url;

    if (!url) {
      showToast(t('noSubUrl'), 'error');
      return;
    }

    showToast(t('fetchStarted'), 'info');
    subFetchBtn.disabled = true;
    subFetchBtn.innerHTML = '<span class="spinner-wrap"><span class="spinner"></span></span>';

    try {
      // Try direct fetch first (with CORS mode)
      let response = await fetch(url, { mode: 'cors' });

      if (!response.ok) {
        response = await fetch(url, { mode: 'no-cors' });
      }

      let text;
      try {
        text = await response.text();
      } catch (e) {
        // no-cors gives opaque response, can't read .text()
        throw new Error('CORS blocked. Deploy the Worker or use a CORS proxy.');
      }

      const configs = ConfigManager.parseSubscriptionResponse(text);

      if (configs.length === 0) {
        throw new Error('No valid configs found in subscription response');
      }

      ConfigManager.addSubscription({ url, name });
      ConfigManager.addMultiple(configs.map(c => ({
        ...c,
        link: c.link || '',
        subSource: url,
        method: 'tcp',
        timeout: 5
      })));

      renderAll();
      renderSubscriptions();
      showToast(`${configs.length} ${t('fetchDone')}`, 'success');
    } catch (err) {
      showToast(`${t('fetchFailed')}: ${err.message}`, 'error');
    } finally {
      subFetchBtn.disabled = false;
      subFetchBtn.innerHTML = `<i class="fas fa-download"></i> ${t('fetch')}`;
    }
  }

  // ---- Render Subscriptions ----
  function renderSubscriptions() {
    const subs = ConfigManager.subscriptions;
    if (subs.length === 0) {
      subsSection.style.display = 'none';
      return;
    }
    subsSection.style.display = 'block';
    subsList.innerHTML = subs.map(sub => `
      <div class="sub-chip">
        <i class="fas fa-rss" style="color:var(--accent)"></i>
        <span>${escapeHtml(sub.name || sub.url)}</span>
        <button class="sub-remove" data-url="${escapeHtml(sub.url)}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    subsList.querySelectorAll('.sub-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        ConfigManager.removeSubscription(btn.dataset.url);
        renderSubscriptions();
        renderAll();
      });
    });
  }

  // ---- Export ----
  function exportConfigs() {
    const json = ConfigManager.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `v2ray-configs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(t('exported'), 'success');
  }

  // ---- Tab Switching ----
  function switchTab(tabId) {
    tabBtns.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
    });
    tabContents.forEach(content => {
      const isActive = content.id === `tab-${tabId}`;
      content.classList.toggle('active', isActive);
    });
  }

  // ---- Theme Toggle ----
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? null : 'light';
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('v2ray_dash_theme', next || 'dark');
  }

  // ---- Lang Toggle ----
  function toggleLang() {
    currentLang = currentLang === 'fa' ? 'en' : 'fa';
    document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    langToggle.innerHTML = `<i class="fas fa-globe"></i> ${currentLang === 'fa' ? 'EN' : 'FA'}`;

    // Update all i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });

    localStorage.setItem('v2ray_dash_lang', currentLang);
    renderAll();
    renderSubscriptions();
  }

  // ---- Apply i18n to static elements ----
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });
  }

  // ---- Keyboard shortcuts ----
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter = add config when in single tab
      if (e.ctrlKey && e.key === 'Enter') {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab?.id === 'tab-single') addSingle();
        else if (activeTab?.id === 'tab-bulk') bulkImport();
      }
      // Escape = cancel testing
      if (e.key === 'Escape' && isTestingAll) {
        Tester.cancelAll();
      }
    });
  }

  // ---- Init ----
  function init() {
    // Load saved preferences
    const savedTheme = localStorage.getItem('v2ray_dash_theme');
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    const savedLang = localStorage.getItem('v2ray_dash_lang');
    if (savedLang === 'en') {
      currentLang = 'en';
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      langToggle.innerHTML = '<i class="fas fa-globe"></i> EN';
    }

    applyI18n();

    // Render
    renderAll();
    renderSubscriptions();

    // Event listeners
    testAllBtn.addEventListener('click', testAll);
    clearAllBtn.addEventListener('click', clearAll);
    exportBtn.addEventListener('click', exportConfigs);
    addSingleBtn.addEventListener('click', addSingle);
    bulkImportBtn.addEventListener('click', bulkImport);
    subFetchBtn.addEventListener('click', fetchSubscription);
    themeToggle.addEventListener('click', toggleTheme);
    langToggle.addEventListener('click', toggleLang);

    // Tab switching
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Enter key on single config link
    $('#configLink').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addSingle();
    });

    setupKeyboard();

    // Auto-test on page load? Could add option later
    console.log(`V2Ray Dash loaded — ${ConfigManager.getAll().length} configs`);
  }

  // ---- Boot ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

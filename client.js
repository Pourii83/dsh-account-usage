window.__ModuleLoader__.load({
  id: '@local/dsh-account-usage',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'accountUsage';
    /** Stable id of the package-owned stylesheet. */
    const STYLE_ID = '@local/dsh-account-usage/dock';
    /** Slot this plugin contributes the reading to. */
    const SLOT = 'conversation.composer.dock';
    /** Cell key beside the shipped `activity` and `usage` cells. */
    const CELL_ID = 'account-usage';
    /**
     * Flex order inside the dock row. The shipped context meter is a sibling of
     * the dock outlet with the default order 0, so a positive order puts this
     * reading right after it — the spot the user asked for.
     */
    const ROW_ORDER = 1;
    /** Balance refresh cadence; the platform wallet API is read, not polled hard. */
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

    //#region locales
    const en = {
      title: 'Usage',
      aria: 'Usage: {amount}',
      unavailable: 'The account balance could not be read.',
    };
    const fa = {
      title: 'مصرف',
      aria: 'مصرف: {amount}',
      unavailable: 'خواندن موجودی حساب ممکن نشد.',
    };
    //#endregion

    //#region formatting

    /**
     * Fallback translator used only when the slot hands no locale seat over.
     * @param {string} key dictionary key.
     * @param {Record<string, unknown>} [params] interpolation values.
     * @returns {string} display text.
     */
    function fallbackTranslate(key, params) {
      const template = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
      if (params === undefined || params === null) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    }

    /**
     * Currency glyph for a platform wallet currency.
     * @param {string} currency wallet currency code.
     * @returns {string} symbol or a spaced code for unknown currencies.
     */
    function currencySymbol(currency) {
      if (currency === 'CNY') return '\u00a5';
      if (currency === 'USD') return '$';
      return typeof currency === 'string' && currency !== '' ? currency + '\u00a0' : '';
    }

    /** Truncate to two decimals and keep the trailing zeros (platform rounding). */
    function twoDecimals(value) {
      return (Math.floor(value * 100) / 100).toFixed(2);
    }

    /** Group the integer part the way the account settings page does. */
    function groupDigits(text) {
      const parts = text.split('.');
      const whole = Number(parts[0]);
      const integer = Number.isFinite(whole) ? whole.toLocaleString() : parts[0];
      return parts.length > 1 ? integer + '.' + parts[1] : integer;
    }

    /**
     * Format one parsed balance amount as signed currency text, mirroring the
     * account settings page: two decimals, sub-cent floors, grouped digits.
     * @param {number} amount parsed amount.
     * @param {string} currency wallet currency code.
     * @returns {string} display text.
     */
    function formatMoney(amount, currency) {
      const symbol = currencySymbol(currency);
      if (!Number.isFinite(amount)) return symbol + '\u2014';
      if (amount === 0) return symbol + '0.00';
      if (amount < 0) {
        const absolute = Math.abs(amount);
        return '-' + symbol + (absolute < 0.01 ? '0.01' : groupDigits(twoDecimals(absolute)));
      }
      if (amount < 0.01) return '<' + symbol + '0.01';
      return symbol + groupDigits(twoDecimals(amount));
    }

    /**
     * Group the ready wallet arrays by currency, keeping topped-up and granted
     * amounts apart.
     * @param {{value?: unknown, bonusWallets?: unknown}} balance ready balance value.
     * @returns {{currency: string, toppedUp: number, granted: number}[]} per-currency totals.
     */
    function groupWallets(balance) {
      /** @type {Map<string, {currency: string, toppedUp: number, granted: number}>} */
      const groups = new Map();
      const add = (wallet, field) => {
        if (wallet === null || typeof wallet !== 'object') return;
        const amount = typeof wallet.balance === 'string' ? Number.parseFloat(wallet.balance) : NaN;
        if (!Number.isFinite(amount) || amount < 0) return;
        const currency = typeof wallet.currency === 'string' && wallet.currency !== '' ? wallet.currency : 'CNY';
        let group = groups.get(currency);
        if (group === undefined) {
          group = { currency, toppedUp: 0, granted: 0 };
          groups.set(currency, group);
        }
        group[field] += amount;
      };
      const value = Array.isArray(balance.value) ? balance.value : [];
      const bonus = Array.isArray(balance.bonusWallets) ? balance.bonusWallets : [];
      for (const wallet of value) add(wallet, 'toppedUp');
      for (const wallet of bonus) add(wallet, 'granted');
      return [...groups.values()];
    }

    /**
     * Summarize one balance value as the plain text the dock shows.
     * @param {unknown} balance balance value from the account Remote.
     * @returns {{groups: {currency: string, toppedUp: number, granted: number}[], text: string} | null} summary.
     */
    function summarizeBalance(balance) {
      if (balance === null || typeof balance !== 'object' || balance.status !== 'ready') return null;
      const groups = groupWallets(balance);
      if (groups.length === 0) return null;
      const text = groups.map((group) => formatMoney(group.toppedUp + group.granted, group.currency)).join(' \u00b7 ');
      return { groups, text };
    }

    //#endregion

    //#region styles

    /** One plain reading in the dock row, styled like the host performance pills. */
    const CSS = [
      '.acu-usage{flex:none;display:inline-flex;align-items:center;order:' + ROW_ORDER + ';padding:1px 2px;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));font-variant-numeric:tabular-nums;white-space:nowrap;user-select:text}',
      '.acu-usageMuted{color:var(--dsw-alias-state-idle-primary)}',
    ].join('\n');

    /**
     * Insert or find the package-owned stylesheet.
     * @returns {HTMLStyleElement} the stylesheet element.
     */
    function ensureStyleTag() {
      const selector = 'style[data-plugin-css=' + JSON.stringify(STYLE_ID) + ']';
      const existing = document.querySelector(selector);
      if (existing !== null) return /** @type {HTMLStyleElement} */ (existing);
      const tag = document.createElement('style');
      tag.dataset.plugin = '@local/dsh-account-usage';
      tag.dataset.pluginCss = STYLE_ID;
      document.head.appendChild(tag);
      return tag;
    }

    //#endregion

    //#region account snapshot store

    /**
     * One immutable balance snapshot plus subscribers, so the reading
     * re-renders only when a refresh actually changes it.
     * @returns {{getSnapshot: () => object, subscribe: (listener: () => void) => () => void, publish: (next: object) => void}} the store.
     */
    function createStore() {
      let snapshot = { status: 'loading', view: undefined, balance: undefined, updatedAt: 0, stale: false };
      const listeners = new Set();
      return {
        getSnapshot() {
          return snapshot;
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        publish(next) {
          const previous = snapshot;
          if (previous.status === next.status && previous.view === next.view &&
            previous.balance === next.balance && previous.updatedAt === next.updatedAt &&
            previous.stale === next.stale) return;
          snapshot = next;
          for (const listener of [...listeners]) {
            try {
              listener();
            } catch (error) {
              console.error('account-usage: subscriber failed', error);
            }
          }
        },
      };
    }

    /**
     * Read the client build version the account Remote forwards to the platform.
     * The page boot manifest owns it; a missing release keeps a harmless value.
     * @returns {string} client version.
     */
    function clientVersion() {
      const boot = globalThis.__DSH_BOOT__;
      const release = boot !== null && typeof boot === 'object' ? boot.release : undefined;
      const version = release !== null && typeof release === 'object' ? release.version : undefined;
      return typeof version === 'string' && version !== '' ? version : '0.0.0';
    }

    /**
     * Read the account projection and, while signed in, the platform wallets.
     * The newest read wins: a slower earlier read never overwrites it, and a
     * failed refresh keeps the last good reading marked stale.
     * @param {import('@deepseek-ai/cordis').Context} ctx client plugin context.
     * @param {ReturnType<typeof createStore>} store plugin snapshot store.
     * @returns {{refresh: () => Promise<void>, dispose: () => void}} the source.
     */
    function createBalanceSource(ctx, store) {
      let generation = 0;
      let disposed = false;
      const clientMetadata = () => ({
        version: clientVersion(),
        locale: ctx.locale.getSnapshot().active,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      });
      const keepLastGood = (view) => {
        const previous = store.getSnapshot();
        if (previous.status === 'ready') store.publish({ ...previous, view, stale: true });
        else store.publish({ status: 'unavailable', view, balance: undefined, updatedAt: previous.updatedAt, stale: false });
      };
      const refresh = async () => {
        const current = ++generation;
        const previous = store.getSnapshot();
        let view;
        try {
          const result = await ctx.remote.account.getState();
          if (!result.ok) throw result.error ?? new Error('account state read refused');
          view = result.value;
        } catch (error) {
          if (disposed || current !== generation) return;
          console.error('account-usage: account state read failed', error);
          keepLastGood(previous.view);
          return;
        }
        if (disposed || current !== generation) return;
        if (view === null || typeof view !== 'object' || view.status !== 'credential-stored') {
          store.publish({ status: 'signed-out', view, balance: undefined, updatedAt: Date.now(), stale: false });
          return;
        }
        try {
          const result = await ctx.remote.account.getBalance(clientMetadata());
          if (disposed || current !== generation) return;
          if (!result.ok) throw result.error ?? new Error('balance read refused');
          const balance = result.value;
          if (balance === null) {
            store.publish({ status: 'signed-out', view, balance: undefined, updatedAt: Date.now(), stale: false });
            return;
          }
          if (typeof balance === 'object' && balance.status === 'ready') {
            store.publish({ status: 'ready', view, balance, updatedAt: Date.now(), stale: false });
            return;
          }
          keepLastGood(view);
        } catch (error) {
          if (disposed || current !== generation) return;
          console.error('account-usage: balance read failed', error);
          keepLastGood(view);
        }
      };
      return {
        refresh,
        dispose() {
          disposed = true;
          generation += 1;
        },
      };
    }

    /** Plugin-scoped snapshot shared by the dock reading and the freshness effect. */
    const store = createStore();

    //#endregion

    //#region components

    /**
     * The composer-dock usage reading: the account credit as plain text beside
     * the host context meter. It is not interactive — clicking it does nothing.
     * @param {{t?: (key: string, params?: Record<string, unknown>) => string}} props slot props.
     * @returns {import('react').ReactElement | null} the reading, or null until a signed-in balance exists.
     */
    function AccountUsageText(props) {
      const t = typeof props.t === 'function' ? props.t : fallbackTranslate;
      const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
      const summary = React.useMemo(() => summarizeBalance(snapshot.balance), [snapshot.balance]);

      // A signed-out or still-loading account has no reading to show.
      if (snapshot.status === 'loading' || snapshot.status === 'signed-out') return null;

      const ready = snapshot.status === 'ready' && summary !== null;
      const amountText = ready ? summary.text : '\u2014';
      const label = ready ? t('aria', { amount: amountText }) : t('title');
      return h('span', {
        className: 'acu-usage' + (ready ? '' : ' acu-usageMuted'),
        'data-composer-dock-account-usage': true,
        title: label,
      }, amountText);
    }

    //#endregion

    //#region plugin

    /** Services the browser half needs. */
    const inject = [
      'slots',
      'locale',
      'remote',
      'remote.account',
      'remoteAccess',
    ];

    /**
     * Mount the stylesheet, keep the account reading fresh, and contribute the
     * text to the composer dock once the peer may read account surfaces.
     * @param {import('@deepseek-ai/cordis').Context} ctx browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en, fa }), 'account-usage: dictionaries');
      ctx.effect(() => {
        const tag = ensureStyleTag();
        tag.textContent = CSS;
        return () => {
          tag.remove();
        };
      }, 'account-usage: stylesheet');

      ctx.effect(() => {
        const source = createBalanceSource(ctx, store);
        void source.refresh();
        const onVisible = () => {
          if (document.visibilityState === 'visible') void source.refresh();
        };
        const onFocus = () => {
          void source.refresh();
        };
        const timer = window.setInterval(() => {
          if (document.visibilityState !== 'hidden') void source.refresh();
        }, REFRESH_INTERVAL_MS);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.clearInterval(timer);
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
          source.dispose();
        };
      }, 'account-usage: balance reads');

      ctx.remoteAccess.whenAccess('account/watch', () => ctx.slots.inject(SLOT, () => ctx.slots.register({
        name: SLOT,
        id: CELL_ID,
        order: 2,
        locale: NS,
      }, AccountUsageText)));
    }

    return { inject, apply };
  },
});

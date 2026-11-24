// UI text in English and Traditional Chinese, and the chosen language.
// HTML elements use data-i18n="key" (text), data-i18n-html="key" (trusted markup from this file)
// and data-i18n-attr="attr:key,attr:key". Booth/product text comes from the encrypted data.

const STRINGS = {
  en: {
    title: 'Booth 3D Tour',
    lockText: 'This page is private. Type the password you got from the team.',
    password: 'Password',
    open: 'Open booth',
    opening: 'Opening…',
    wrongPw: 'Wrong password. Try again.',
    loadFail: 'Cannot load the booth data. Reload the page.',
    loading: 'Loading',
    keyWalk: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows: walk',
    keyLook: 'Mouse: look around · <kbd>Shift</kbd>: run',
    keyClick: 'Point at a product and click to see its details',
    keyList: '<kbd>P</kbd>: product list · <kbd>Esc</kbd>: pause',
    enter: 'Click to enter the booth',
    productList: 'Product list',
    productsBtn: '☰ Products',
    productListKey: 'Product list (P)',
    products: 'Products',
    preview: 'PREVIEW (not saved)',
    productPage: 'Product page ↗',
    contact: 'Contact sales',
    mobile: 'Mobile',
    email: 'Email',
    close: 'Close',
    comingSoon: 'Product description coming soon.',
    other: 'Other',
    booth: (s) => `Booth ${s}`,
    hintTouch: 'Left stick: walk · Drag: look · Tap a product or the (i) marker',
    hintDrag: 'WASD / arrows: walk · Drag: look · Click a product · P: product list',
    hintLock: 'WASD / arrows: walk · Mouse: look · Click: open product · Shift: run · P: list · Esc: pause',
    clickSuffix: ' · click',
    langBtn: '中文',
    langBtnLabel: 'Switch to Chinese',
  },
  zh: {
    title: '3D 展位導覽',
    lockText: '此頁面僅供內部使用。請輸入團隊提供的密碼。',
    password: '密碼',
    open: '進入展位',
    opening: '開啟中…',
    wrongPw: '密碼錯誤，請再試一次。',
    loadFail: '無法載入展位資料，請重新整理頁面。',
    loading: '載入中',
    keyWalk: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或方向鍵：移動',
    keyLook: '滑鼠：環顧四周 · <kbd>Shift</kbd>：加速',
    keyClick: '將準心對準產品並點擊，即可查看詳情',
    keyList: '<kbd>P</kbd>：產品清單 · <kbd>Esc</kbd>：暫停',
    enter: '點擊進入展位',
    productList: '產品清單',
    productsBtn: '☰ 產品',
    productListKey: '產品清單 (P)',
    products: '產品',
    preview: '預覽(尚未儲存)',
    productPage: '產品頁面 ↗',
    contact: '聯絡業務',
    mobile: '手機',
    email: '電子郵件',
    close: '關閉',
    comingSoon: '產品介紹即將推出。',
    other: '其他',
    booth: (s) => `攤位 ${s}`,
    hintTouch: '左側搖桿：移動 · 拖曳：環顧 · 點擊產品或 (i) 標記',
    hintDrag: 'WASD/方向鍵：移動 · 拖曳：環顧 · 點擊產品 · P：產品清單',
    hintLock: 'WASD/方向鍵：移動 · 滑鼠：環顧 · 點擊：查看產品 · Shift：加速 · P：清單 · Esc：暫停',
    clickSuffix: ' · 點擊',
    langBtn: 'EN',
    langBtnLabel: '切換為英文',
  },
};

const KEY = 'booth3d.lang';
let lang = (() => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch { /* storage blocked */ }
  return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
})();
const listeners = new Set();

export const getLang = () => lang;
export const t = (key, ...args) => {
  const v = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
};
export const onLangChange = (fn) => listeners.add(fn);

/** Pick the text for the current language; falls back to the other one when empty. */
export const pick = (en, zh) => (lang === 'zh' ? (zh || en) : (en || zh)) || '';

export function applyStatic(root = document) {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
}

export function setLang(next) {
  if (next !== 'en' && next !== 'zh') return;
  lang = next;
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
  applyStatic();
  for (const fn of listeners) fn(lang);
}

export const toggleLang = () => setLang(lang === 'en' ? 'zh' : 'en');

/**
 * PWA Chrome 桌面捷徑與安裝管理工具模組
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unsupported';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const stateChangeListeners: Array<() => void> = [];

/**
 * 檢查目前是否已在獨立視窗 (Standalone) 或 PWA 模式中執行
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * 檢查是否為 Chromium 核心瀏覽器 (Google Chrome, Edge, Brave, etc.)
 */
export function isChromiumBased(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isChromium = /chrome|chromium|crios/i.test(userAgent) && !/edg/i.test(userAgent);
  const isEdge = /edg/i.test(userAgent);
  return isChromium || isEdge;
}

/**
 * 是否有可觸發的 Chrome 原生安裝提示
 */
export function canPromptNativeInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * 訂閱 PWA 狀態變更 (用於 Vue 響應式同步)
 */
export function onPwaStateChange(callback: () => void): () => void {
  stateChangeListeners.push(callback);
  return () => {
    const idx = stateChangeListeners.indexOf(callback);
    if (idx !== -1) stateChangeListeners.splice(idx, 1);
  };
}

function notifyStateChange() {
  stateChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[PWA] Listener callback error:', e);
    }
  });
}

/**
 * 初始化全域 PWA 事件監聽器 (自動在載入時執行)
 */
export function initPwaInstallListener(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // 阻止 Chrome 預設的迷你資訊列，改由我們的 UI 觸發
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyStateChange();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyStateChange();
    console.log('[PWA] StampVue 應用已成功安裝至桌面/應用列表！');
  });
}

/**
 * 觸發 Chrome 原生安裝對話框
 */
export async function promptNativeInstall(): Promise<{
  success: boolean;
  outcome: PwaInstallOutcome;
}> {
  if (!deferredPrompt) {
    return { success: false, outcome: 'unsupported' };
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyStateChange();
    return {
      success: choice.outcome === 'accepted',
      outcome: choice.outcome
    };
  } catch (err) {
    console.error('[PWA] 原生安裝呼叫失敗:', err);
    deferredPrompt = null;
    notifyStateChange();
    return { success: false, outcome: 'unsupported' };
  }
}

/**
 * 產生並下載 Windows 桌面網頁捷徑檔 (.url)
 * 供不支援 beforeinstallprompt 或手動關閉原生提示時的 100% 降級方案
 */
export function downloadWindowsShortcut(
  appName: string = 'StampVue 印章去背',
  targetUrl: string = typeof window !== 'undefined' ? window.location.href : ''
): void {
  if (typeof window === 'undefined' || !targetUrl) return;

  const fileContent = `[InternetShortcut]\r\nURL=${targetUrl}\r\nIconIndex=0\r\n`;
  const blob = new Blob([fileContent], { type: 'application/internet-shortcut' });
  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `${appName}.url`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}

// 預設自動初始化
initPwaInstallListener();

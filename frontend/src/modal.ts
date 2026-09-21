import Vue from 'vue';
import StampModal from './components/StampModal.vue';
import type { ProcessedStampResult } from './types/stamp';

export interface StampModalOptions {
  /** 彈出視窗標題 */
  title?: string;
  /** 初始載入的影像 Base64 或 URL */
  initialImage?: string;
  /** 是否在開啟時自動載入白紙紅印陰影示範圖 (預設 false) */
  showSampleOnMount?: boolean;
  /** 使用者點擊確認/下載時是否自動觸發瀏覽器下載透明 PNG (預設 true) */
  autoDownload?: boolean;
  /** 使用者確認產出時之回呼函式 */
  onConfirm?: (result: ProcessedStampResult) => void;
  /** 使用者關閉或取消彈窗時之回呼函式 */
  onCancel?: () => void;
}

/**
 * 以純函式呼叫在任何網頁中動態彈出 StampVue 印章去背工作台
 * @param options 設定參數與回呼
 * @returns Promise<ProcessedStampResult | null> 返回去背成果物件，若使用者取消則為 null
 */
export function openStampModal(options: StampModalOptions = {}): Promise<ProcessedStampResult | null> {
  return new Promise((resolve) => {
    // 建立臨時獨立 DOM 掛載點
    const mountNode = document.createElement('div');
    mountNode.className = 'stampvue-modal-mount-root';
    document.body.appendChild(mountNode);

    const ModalConstructor = Vue.extend(StampModal);
    const instance = new ModalConstructor({
      propsData: {
        title: options.title,
        initialImage: options.initialImage,
        showSampleOnMount: options.showSampleOnMount ?? false,
        autoDownload: options.autoDownload ?? true
      }
    });

    const cleanup = () => {
      instance.$destroy();
      if (mountNode.parentNode) {
        mountNode.parentNode.removeChild(mountNode);
      }
    };

    instance.$on('confirm', (res: ProcessedStampResult) => {
      cleanup();
      options.onConfirm?.(res);
      resolve(res);
    });

    instance.$on('cancel', () => {
      cleanup();
      options.onCancel?.();
      resolve(null);
    });

    instance.$mount(mountNode);
  });
}

<template>
  <div v-if="isOpen" class="shortcut-modal-overlay" @click.self="close">
    <div class="shortcut-modal-card">
      <!-- 頂部標題與關閉 -->
      <div class="modal-header">
        <div class="header-title-group">
          <div class="stamp-badge">
            <span>印</span>
          </div>
          <div>
            <h3 class="modal-title">{{ isReinstall ? '重新建立 StampVue 桌面捷徑' : '建立 StampVue 桌面捷徑' }}</h3>
            <p class="modal-subtitle">快速將 StampVue 放到電腦桌面，雙擊即可獨立秒開！</p>
          </div>
        </div>
        <button class="btn-close" @click="close" title="關閉">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 內容主體 -->
      <div class="modal-body">
        <!-- 若偵測為曾安裝或捷徑移除情境，顯示友善提示橫幅 -->
        <div v-if="isReinstall" class="reinstall-notice">
          <div class="notice-icon">ℹ️</div>
          <div class="notice-text">
            <strong>桌面捷徑被移除或不見了？</strong>
            <p>
              Chrome 判定 StampVue 已在應用列表中（或處於解除安裝冷卻期），因此不會再次主動彈出原生提示。您可以透過下方方式 <strong>1 秒放回桌面</strong>！
            </p>
          </div>
        </div>

        <!-- 方案 1: 一鍵下載 Windows 網頁捷徑檔 (秒解) -->
        <div class="method-card primary-card">
          <div class="method-badge">最速秒解・推薦方式 1</div>
          <div class="method-content">
            <div class="method-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div class="method-text">
              <div class="method-title">一鍵下載 Windows 桌面捷徑檔 (.url)</div>
              <div class="method-desc">點擊下方按鈕直接下載捷徑，下載後拖曳至桌面即可點擊啟動，不受 Chrome 快取限制！</div>
            </div>
          </div>
          <button class="btn-action-primary" @click="handleDownload">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>立即下載桌面捷徑檔</span>
          </button>
        </div>

        <!-- 方案 2: Chrome 應用程式管理還原 (Chrome 內建) -->
        <div class="method-card">
          <div class="method-badge secondary">推薦方式 2 (Chrome 內建還原)</div>
          <div class="method-title-inline">從 Chrome 應用程式庫重新建立桌面圖示：</div>
          <ol class="steps-list">
            <li>
              <span class="step-num">1</span>
              <span>在 Chrome 網址列輸入 <code class="code-badge">chrome://apps</code> 並按 Enter。</span>
            </li>
            <li>
              <span class="step-num">2</span>
              <span>找到 <strong>StampVue</strong> 圖示，點擊滑鼠右鍵 ➔ 選擇 <strong>「建立捷徑...」</strong>。</span>
            </li>
            <li>
              <span class="step-num">3</span>
              <span>勾選「桌面」並點擊「建立」，原生桌面圖示立即恢復！</span>
            </li>
          </ol>
        </div>

        <!-- 方案 3 (進階): 完全重置 Chrome 狀態 -->
        <details class="advanced-reset">
          <summary class="advanced-summary">想重新看到 Chrome 第一次的原生安裝對話框？</summary>
          <div class="advanced-content">
            若想完整還原成全新未安裝狀態：至 <code class="code-badge">chrome://apps</code> 在 StampVue 按右鍵點選「從 Chrome 移除」，並按 F12 於 Application ➔ Storage 點擊「Clear site data」後重新整理頁面即可。
          </div>
        </details>
      </div>

      <!-- 底部操作列 -->
      <div class="modal-footer">
        <button class="btn-secondary" @click="close">關閉</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { downloadWindowsShortcut } from '../utils/pwaInstall';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    isReinstall?: boolean;
  }>(),
  {
    isOpen: false,
    isReinstall: false
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const close = () => {
  emit('close');
};

const handleDownload = () => {
  downloadWindowsShortcut('StampVue 專業印章去背');
};
</script>

<style scoped>
.shortcut-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

.shortcut-modal-card {
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  max-width: 540px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.15);
  color: #f8fafc;
  overflow: hidden;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.stamp-badge {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.modal-subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.btn-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

.reinstall-notice {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.notice-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.notice-text {
  font-size: 0.84rem;
  color: #bfdbfe;
}

.notice-text strong {
  color: #ffffff;
  display: block;
  margin-bottom: 3px;
}

.notice-text p {
  margin: 0;
  color: #93c5fd;
  line-height: 1.4;
}

.method-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  position: relative;
}

.primary-card {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(30, 41, 59, 0.8));
  border-color: rgba(239, 68, 68, 0.3);
}

.method-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: #ef4444;
  color: white;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

.method-badge.secondary {
  background: #3b82f6;
}

.method-content {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.method-icon {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.method-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #f1f5f9;
}

.method-desc {
  font-size: 0.82rem;
  color: #94a3b8;
  margin-top: 4px;
  line-height: 1.4;
}

.btn-action-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-action-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.45);
}

.method-title-inline {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 10px;
}

.steps-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.steps-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.step-num {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  font-weight: 700;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.code-badge {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.82rem;
}

.advanced-reset {
  margin-top: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.advanced-summary {
  cursor: pointer;
  font-size: 0.8rem;
  color: #94a3b8;
  user-select: none;
  transition: color 0.15s;
}

.advanced-summary:hover {
  color: #cbd5e1;
}

.advanced-content {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.5;
}

.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(12px) scale(0.97); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>

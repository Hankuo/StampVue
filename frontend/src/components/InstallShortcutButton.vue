<template>
  <div class="shortcut-action-wrapper" v-if="!isStandalone">
    <!-- 主按鈕：一鍵建立桌面捷徑 (自適應狀態顯示) -->
    <button
      class="btn-install-shortcut"
      :class="{ 'has-native': hasPrompt, 'is-reinstall': !hasPrompt && hasInstalledBefore }"
      @click="handleClick"
      :title="buttonTooltip"
    >
      <span class="btn-icon">
        <svg v-if="!hasPrompt && hasInstalledBefore" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      </span>
      <span class="btn-text">{{ buttonLabel }}</span>
      <span v-if="hasPrompt" class="pulse-indicator"></span>
    </button>

    <!-- 方案 A：一鍵直出輕量 Toast 引導 -->
    <transition name="toast-slide">
      <div v-if="showToast" class="shortcut-toast" role="alert">
        <div class="toast-header">
          <div class="toast-title-group">
            <span class="toast-icon">⚡</span>
            <strong class="toast-title">桌面捷徑已直出一鍵下載！</strong>
          </div>
          <button class="toast-close" @click="showToast = false" title="關閉提示">✕</button>
        </div>
        <div class="toast-body">
          <p class="toast-desc">
            捷徑檔案已存入下載資料夾。請點擊瀏覽器右上角的 <strong>下載列（⬇️）</strong>，直接將檔案 <strong>拖曳至桌面</strong> 即可隨時秒開！
          </p>
        </div>
        <div class="toast-footer">
          <button class="toast-guide-link" @click="openDetailedModal">
            如何重新喚醒 Chrome 原生安裝？
          </button>
        </div>
      </div>
    </transition>

    <!-- 進階備用說明彈窗 (可選) -->
    <InstallShortcutModal
      :is-open="isModalOpen"
      :is-reinstall="hasInstalledBefore"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  isRunningStandalone,
  canPromptNativeInstall,
  promptNativeInstall,
  checkInstalledInBrowser,
  downloadWindowsShortcut,
  onPwaStateChange
} from '../utils/pwaInstall';
import InstallShortcutModal from './InstallShortcutModal.vue';

const isStandalone = ref(false);
const hasPrompt = ref(false);
const hasInstalledBefore = ref(false);
const isModalOpen = ref(false);
const showToast = ref(false);

let unsubscribe: (() => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const buttonLabel = computed(() => {
  if (hasPrompt.value) {
    return '一鍵建立桌面捷徑';
  }
  if (hasInstalledBefore.value) {
    return '一鍵下載桌面捷徑';
  }
  return '一鍵建立桌面捷徑';
});

const buttonTooltip = computed(() => {
  if (hasPrompt.value) {
    return 'Chrome 原生安裝就緒：點擊直接彈出視窗放至桌面';
  }
  if (hasInstalledBefore.value) {
    return '點擊一鍵直接下載 Windows 桌面捷徑，直接拖至桌面即可啟動';
  }
  return '將 StampVue 加入電腦桌面捷徑，支援無網址列秒開';
});

const updateState = async () => {
  isStandalone.value = isRunningStandalone();
  hasPrompt.value = canPromptNativeInstall();
  hasInstalledBefore.value = await checkInstalledInBrowser();
};

onMounted(() => {
  updateState();
  unsubscribe = onPwaStateChange(() => {
    updateState();
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
});

const triggerDirectDownload = () => {
  // 一鍵直出：立即下載 Windows 桌面捷徑檔
  downloadWindowsShortcut('StampVue 專業印章去背');
  
  // 顯示輕量 Toast 引導
  showToast.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    showToast.value = false;
  }, 7000);
};

const openDetailedModal = () => {
  showToast.value = false;
  isModalOpen.value = true;
};

const handleClick = async () => {
  if (hasPrompt.value) {
    // 優先觸發 Chrome 原生桌面安裝對話框
    const res = await promptNativeInstall();
    if (!res.success && res.outcome === 'unsupported') {
      // 若原生不可用，無縫降級為方案 A：一鍵直出下載
      triggerDirectDownload();
    }
  } else {
    // 方案 A 核心：不跳出長文對話框，直接一鍵直出下載！
    triggerDirectDownload();
  }
};
</script>

<style scoped>
.shortcut-action-wrapper {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.btn-install-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(15, 23, 42, 0.7);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  user-select: none;
  position: relative;
}

.btn-install-shortcut:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(239, 68, 68, 0.5);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.btn-install-shortcut.has-native {
  border-color: rgba(239, 68, 68, 0.6);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.8));
}

.btn-install-shortcut.is-reinstall {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(15, 23, 42, 0.8));
}

.btn-install-shortcut.is-reinstall:hover {
  border-color: rgba(59, 130, 246, 0.7);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.is-reinstall .btn-icon {
  color: #60a5fa;
}

.btn-text {
  letter-spacing: 0.01em;
}

.pulse-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulseDot 2s infinite;
}

/* 輕量 Toast 樣式 */
.shortcut-toast {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 320px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  padding: 14px;
  color: #f8fafc;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(59, 130, 246, 0.2);
  z-index: 10000;
}

.toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.toast-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast-icon {
  font-size: 1.1rem;
}

.toast-title {
  font-size: 0.88rem;
  color: #60a5fa;
  font-weight: 700;
}

.toast-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.toast-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.toast-body {
  font-size: 0.82rem;
  color: #cbd5e1;
  line-height: 1.45;
}

.toast-desc {
  margin: 0;
}

.toast-desc strong {
  color: #38bdf8;
}

.toast-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
}

.toast-guide-link {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.75rem;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.toast-guide-link:hover {
  color: #38bdf8;
}

/* Toast 動畫 */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

@keyframes pulseDot {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

@media (max-width: 640px) {
  .shortcut-toast {
    right: 10px;
    left: 10px;
    width: auto;
    top: 50px;
  }
}
</style>

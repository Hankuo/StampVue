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

    <!-- 備用下載、手動指引與捷徑還原彈窗 -->
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
  onPwaStateChange
} from '../utils/pwaInstall';
import InstallShortcutModal from './InstallShortcutModal.vue';

const isStandalone = ref(false);
const hasPrompt = ref(false);
const hasInstalledBefore = ref(false);
const isModalOpen = ref(false);

let unsubscribe: (() => void) | null = null;

const buttonLabel = computed(() => {
  if (hasPrompt.value) {
    return '一鍵建立桌面捷徑';
  }
  if (hasInstalledBefore.value) {
    return '重新建立桌面捷徑';
  }
  return '建立桌面捷徑';
});

const buttonTooltip = computed(() => {
  if (hasPrompt.value) {
    return 'Chrome 原生安裝就緒：點擊一鍵安裝並放置捷徑至桌面';
  }
  if (hasInstalledBefore.value) {
    return '捷徑被移除或處於瀏覽器模式？點擊重新放回桌面';
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
});

const handleClick = async () => {
  if (hasPrompt.value) {
    // 優先觸發 Chrome 原生桌面安裝對話框
    const res = await promptNativeInstall();
    if (!res.success && res.outcome === 'unsupported') {
      // 若原生 prompt 不可用或失敗，彈出降級教學與下載彈窗
      isModalOpen.value = true;
    }
  } else {
    // 若尚未捕捉到 prompt（如曾安裝、手動關閉過或冷卻期），開啟自適應彈窗
    isModalOpen.value = true;
  }
};
</script>

<style scoped>
.shortcut-action-wrapper {
  display: inline-flex;
  align-items: center;
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
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(15, 23, 42, 0.8));
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

@keyframes pulseDot {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}
</style>

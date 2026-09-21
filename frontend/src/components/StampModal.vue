<template>
  <div class="stampvue-modal-backdrop" @click.self="handleCancel">
    <div class="stampvue-modal-dialog glass-panel">
      <!-- Modal 頂部列 -->
      <div class="stampvue-modal-header">
        <div class="stampvue-modal-title">
          <span class="stamp-icon">🖃</span>
          <span class="title-text">{{ title || 'StampVue 印章去背工作台' }}</span>
        </div>
        <button class="stampvue-close-btn" type="button" title="關閉" @click="handleCancel">
          ✕
        </button>
      </div>

      <!-- Modal 內容區 -->
      <div class="stampvue-modal-body">
        <StampWorkbench
          :initial-image="initialImage"
          :show-sample-on-mount="showSampleOnMount"
          :auto-download-on-export="autoDownload"
          @export="handleExport"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StampWorkbench from './StampWorkbench.vue';
import type { ProcessedStampResult } from '../types/stamp';

const props = withDefaults(
  defineProps<{
    title?: string;
    initialImage?: string;
    showSampleOnMount?: boolean;
    autoDownload?: boolean;
  }>(),
  {
    title: 'StampVue 印章去背工作台',
    initialImage: '',
    showSampleOnMount: false,
    autoDownload: true
  }
);

const emit = defineEmits<{
  (e: 'confirm', result: ProcessedStampResult): void;
  (e: 'cancel'): void;
}>();

const handleExport = (result: ProcessedStampResult) => {
  emit('confirm', result);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.stampvue-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

.stampvue-modal-dialog {
  max-width: 1200px;
  width: 100%;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(239, 68, 68, 0.12);
  overflow: hidden;
  animation: modalEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.stampvue-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(15, 23, 42, 0.7);
}

.stampvue-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stamp-icon {
  font-size: 1.25rem;
}

.title-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.stampvue-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.stampvue-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--accent-red);
  color: #ffffff;
}

.stampvue-modal-body {
  padding: 14px 18px;
  overflow-y: auto;
  max-height: calc(94vh - 60px);
}

@media (max-width: 640px) {
  .stampvue-modal-backdrop {
    padding: 6px;
  }

  .stampvue-modal-header {
    padding: 10px 14px;
  }

  .stampvue-modal-body {
    padding: 8px 10px;
  }
}
</style>

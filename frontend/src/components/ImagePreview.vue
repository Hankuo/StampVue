<template>
  <div class="preview-card glass-panel">
    <div class="preview-header">
      <div class="title-wrap">
        <span class="step-badge">3</span>
        <h3>成果檢視與匯出</h3>
      </div>

      <!-- 統計中繼資料 -->
      <div v-if="result" class="metrics-row">
        <span class="badge" :class="result.detectedColor === 'red' ? 'badge-red' : 'badge-blue'">
          {{ result.detectedColor === 'red' ? '🔴 紅色印章' : '🔵 藍色印章' }}
        </span>
        <span class="badge badge-neutral">
          📐 {{ result.width }} × {{ result.height }} px
        </span>
        <span class="badge badge-speed">
          ⚡ {{ result.processingTimeMs }} ms
        </span>
      </div>
    </div>

    <!-- 檢視模式與背景切換工具列 -->
    <div class="toolbar-row">
      <!-- 檢視模式切換 -->
      <div class="view-mode-tabs">
        <button
          class="tab-btn"
          :class="{ active: viewMode === 'split' }"
          @click="viewMode = 'split'"
        >
          ↔️ 前後對比
        </button>
        <button
          class="tab-btn"
          :class="{ active: viewMode === 'extracted' }"
          @click="viewMode = 'extracted'"
        >
          ✨ 純去背印章
        </button>
        <button
          class="tab-btn"
          :class="{ active: viewMode === 'original' }"
          @click="viewMode = 'original'"
        >
          📷 原始照片
        </button>
      </div>

      <!-- 背景切換 -->
      <div class="bg-picker-tabs">
        <button
          class="bg-btn bg-checker-icon"
          :class="{ active: currentBg === 'checkerboard' }"
          title="透明棋盤格"
          @click="currentBg = 'checkerboard'"
        ></button>
        <button
          class="bg-btn bg-white-icon"
          :class="{ active: currentBg === 'white' }"
          title="白色紙張底"
          @click="currentBg = 'white'"
        ></button>
        <button
          class="bg-btn bg-paper-icon"
          :class="{ active: currentBg === 'paper' }"
          title="合約底稿"
          @click="currentBg = 'paper'"
        ></button>
        <button
          class="bg-btn bg-dark-icon"
          :class="{ active: currentBg === 'dark' }"
          title="深黑底色"
          @click="currentBg = 'dark'"
        ></button>
      </div>
    </div>

    <!-- 步驟 3 印章旋轉角度調校列 -->
    <div v-if="originalImageUrl" class="rotation-toolbar">
      <div class="rot-title-wrap">
        <span class="rot-label">🔄 旋轉角度:</span>
        <span class="rot-val-badge">{{ currentOptions.rotation || 0 }}°</span>
      </div>

      <div class="rot-quick-actions">
        <button
          type="button"
          class="rot-action-btn"
          title="向左旋轉 90 度"
          @click="rotateBy(-90)"
        >
          ↺ 向左 90°
        </button>
        <button
          type="button"
          class="rot-action-btn"
          title="向右旋轉 90 度"
          @click="rotateBy(90)"
        >
          ↻ 向右 90°
        </button>
        <button
          type="button"
          class="rot-action-btn"
          title="重設旋轉角度為 0 度"
          @click="setRotation(0)"
        >
          ⟲ 重設 0°
        </button>
      </div>

      <div class="rot-slider-box">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          :value="currentOptions.rotation || 0"
          class="rot-range-input"
          @input="onRotationSliderChange"
        />
      </div>
    </div>

    <!-- 畫布/預覽展示區 -->
    <div
      class="canvas-viewport"
      :class="bgClass"
    >
      <div v-if="!originalImageUrl" class="empty-placeholder">
        <div class="empty-icon">🖃</div>
        <p>請先由步驟 1 拍照或載入印章圖片</p>
      </div>

      <div v-else class="image-stage" :style="stageTransformStyle">
        <!-- 1. 印章裁切原圖模式 -->
        <img
          v-if="viewMode === 'original'"
          :src="result?.croppedOriginalDataUrl || originalImageUrl"
          alt="原始圖片"
          class="stage-img"
        />

        <!-- 2. 純去背印章模式 -->
        <img
          v-else-if="viewMode === 'extracted' && result"
          :src="result.dataUrl"
          alt="去背印章"
          class="stage-img extracted-shadow-glow"
        />

        <!-- 3. 前後對比分割模式 (Split Slider) -->
        <div
          ref="splitContainerRef"
          v-else-if="viewMode === 'split' && result"
          class="split-container"
          @mousedown="startSplitDrag"
          @touchstart.passive="startSplitDrag"
        >
          <!-- 左側：印章裁切原圖 (0% ~ splitPos%) -->
          <div
            class="split-layer-wrap left-original"
            :style="{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }"
          >
            <img :src="result?.croppedOriginalDataUrl || originalImageUrl" alt="原始照片" class="split-layer original-layer" />
          </div>

          <!-- 右側：印章去背成果 (splitPos% ~ 100%) -->
          <div
            class="split-layer-wrap right-extracted"
            :style="{ clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)` }"
          >
            <img :src="result.dataUrl" alt="去背成果" class="split-layer extracted-layer" />
          </div>

          <!-- 分割拉桿與手柄 -->
          <div class="split-divider-line" :style="{ left: `${splitPos}%` }">
            <div class="split-handle">
              <span class="handle-arrow">◀▶</span>
            </div>
          </div>

          <!-- 標籤浮水印 -->
          <div class="split-tag tag-left" v-if="splitPos > 15">原始照片 (含陰影)</div>
          <div class="split-tag tag-right" v-if="splitPos < 85">智慧去背成果</div>
        </div>
      </div>

      <!-- 縮放與重設懸浮控制鈕 -->
      <div v-if="originalImageUrl" class="zoom-floating-controls">
        <button class="zoom-btn" @click="zoomIn" title="放大">＋</button>
        <span class="zoom-level">{{ Math.round(zoomScale * 100) }}%</span>
        <button class="zoom-btn" @click="zoomOut" title="縮小">－</button>
        <button class="zoom-btn reset-zoom" @click="resetZoom" title="重設縮放">⟲</button>
      </div>
    </div>

    <!-- 底部匯出與操作按鈕 -->
    <div class="export-actions-row">
      <!-- 下載透明 PNG (客戶端) -->
      <button class="btn btn-primary btn-download" :disabled="!result" @click="downloadPng">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        下載透明 PNG
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import confetti from 'canvas-confetti';
import type { StampOptions, ProcessedStampResult, PreviewBackground } from '../types/stamp';

const props = defineProps<{
  originalImageUrl: string;
  result: ProcessedStampResult | null;
  currentOptions: StampOptions;
}>();

const emit = defineEmits<{
  (e: 'update:rotation', angle: number): void;
  (e: 'rotate', angle: number): void;
}>();

const rotateBy = (delta: number) => {
  const current = props.currentOptions.rotation || 0;
  const next = (current + delta + 360) % 360;
  emit('update:rotation', next);
  emit('rotate', next);
};

const setRotation = (angle: number) => {
  emit('update:rotation', angle);
  emit('rotate', angle);
};

const onRotationSliderChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = Number(target.value);
  emit('update:rotation', val);
  emit('rotate', val);
};

const viewMode = ref<'split' | 'extracted' | 'original'>('split');
const currentBg = ref<PreviewBackground>('checkerboard');
const splitPos = ref<number>(50);
const zoomScale = ref<number>(1);
const splitContainerRef = ref<HTMLElement | null>(null);
let isDraggingSplit = false;

const bgClass = computed(() => {
  switch (currentBg.value) {
    case 'white': return 'bg-white-preview';
    case 'dark': return 'bg-dark-preview';
    case 'paper': return 'bg-paper-preview';
    default: return 'bg-checkerboard';
  }
});

const stageTransformStyle = computed(() => ({
  transform: `scale(${zoomScale.value})`,
  transition: 'transform 0.15s ease'
}));

const updateSplitPosition = (clientX: number) => {
  if (!splitContainerRef.value) return;
  const rect = splitContainerRef.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  splitPos.value = Math.round((x / rect.width) * 100);
};

const startSplitDrag = (e: MouseEvent | TouchEvent) => {
  isDraggingSplit = true;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  updateSplitPosition(clientX);
  window.addEventListener('mousemove', onSplitDragMove);
  window.addEventListener('mouseup', stopSplitDrag);
  window.addEventListener('touchmove', onSplitDragMove);
  window.addEventListener('touchend', stopSplitDrag);
};

const onSplitDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDraggingSplit) return;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  updateSplitPosition(clientX);
};

const stopSplitDrag = () => {
  isDraggingSplit = false;
  window.removeEventListener('mousemove', onSplitDragMove);
  window.removeEventListener('mouseup', stopSplitDrag);
  window.removeEventListener('touchmove', onSplitDragMove);
  window.removeEventListener('touchend', stopSplitDrag);
};

const zoomIn = () => zoomScale.value = Math.min(3, zoomScale.value + 0.25);
const zoomOut = () => zoomScale.value = Math.max(0.5, zoomScale.value - 0.25);
const resetZoom = () => zoomScale.value = 1;

const downloadPng = () => {
  if (!props.result) return;
  const a = document.createElement('a');
  a.href = props.result.dataUrl;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `stamp_extracted_${timestamp}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.8 }
  });
};


onBeforeUnmount(() => {
  stopSplitDrag();
});
</script>

<style scoped>
.preview-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-badge {
  background: var(--accent-red);
  color: white;
  font-weight: 800;
  font-size: 0.85rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.metrics-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-full);
}
.badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
.badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
.badge-neutral { background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
.badge-speed { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.view-mode-tabs {
  display: inline-flex;
  background: var(--bg-input);
  padding: 3px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.bg-picker-tabs {
  display: flex;
  gap: 6px;
}

.bg-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.bg-btn:hover {
  transform: scale(1.15);
}

.bg-btn.active {
  border-color: var(--accent-red);
  box-shadow: 0 0 8px var(--accent-red-glow);
}

.bg-checker-icon {
  background: #182030;
  background-image: linear-gradient(45deg, #0e1422 25%, transparent 25%), linear-gradient(-45deg, #0e1422 25%, transparent 25%);
  background-size: 8px 8px;
}
.bg-white-icon { background: #ffffff; }
.bg-paper-icon { background: #fdfbf7; border: 1px solid #d1d5db; }
.bg-dark-icon { background: #0b0f19; }

/* Canvas Viewport */
.canvas-viewport {
  position: relative;
  width: 100%;
  height: 440px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.4;
}

.image-stage {
  max-width: 90%;
  max-height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.extracted-shadow-glow {
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

/* Split Slider */
.split-container {
  position: relative;
  display: inline-block;
  max-height: 400px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  cursor: ew-resize;
  user-select: none;
}

.split-layer-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.left-original {
  position: relative;
}

.split-layer {
  display: block;
  max-height: 400px;
  max-width: 100%;
  object-fit: contain;
}

.split-divider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.9);
  pointer-events: none;
}

.split-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  background: #ef4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.split-tag {
  position: absolute;
  bottom: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.725rem;
  font-weight: 700;
  pointer-events: none;
}
.tag-left {
  left: 12px;
  background: rgba(0, 0, 0, 0.65);
  color: white;
}
.tag-right {
  right: 12px;
  background: rgba(239, 68, 68, 0.85);
  color: white;
}

/* Floating Zoom */
.zoom-floating-controls {
  position: absolute;
  bottom: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  z-index: 10;
}

.zoom-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  width: 24px;
  height: 24px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.zoom-btn:hover { color: white; background: var(--bg-glass-hover); }
.zoom-level { font-size: 0.75rem; font-weight: 700; padding: 0 4px; color: var(--text-primary); }

.export-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.btn-download {
  padding: 12px 24px;
  font-size: 1rem;
}

/* 步驟 3 印章旋轉角度調校列 */
.rotation-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.rot-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.rot-val-badge {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.rot-quick-actions {
  display: flex;
  gap: 6px;
}

.rot-action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.775rem;
  padding: 4px 9px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.rot-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.rot-slider-box {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
}

.rot-range-input {
  width: 100%;
  accent-color: var(--accent-red);
  cursor: pointer;
}

/* Responsive Media Queries */
@media (max-width: 640px) {
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .view-mode-tabs {
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    padding: 5px 8px;
  }

  .canvas-viewport {
    min-height: 300px;
    padding: 12px;
  }

  .split-container,
  .split-layer,
  .stage-img {
    max-height: 320px;
  }

  .split-handle {
    width: 36px;
    height: 36px;
  }

  .export-actions-row {
    flex-direction: column;
    width: 100%;
  }

  .export-actions-row .btn {
    width: 100%;
  }

  .rotation-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .rot-quick-actions {
    width: 100%;
  }

  .rot-action-btn {
    flex: 1;
    text-align: center;
  }
}
</style>

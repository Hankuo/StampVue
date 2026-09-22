<template>
  <div class="preview-card glass-panel">
    <!-- 頂部資訊列：標題「預覽」、紅藍印色彩選擇器 (預覽保留棋盤底與純去背，無切換按鍵) -->
    <div class="preview-header-compact">
      <div class="header-left">
        <span class="preview-title">預覽</span>
      </div>
      <div class="header-right">
        <!-- 印章色彩下拉選單 (預設紅印) -->
        <div class="color-select-wrapper">
          <select
            :value="currentOptions.colorMode === 'blue' ? 'blue' : 'red'"
            class="stamp-color-select"
            title="選擇印章顏色模式"
            @change="onColorChange"
          >
            <option value="red">🔴 紅印</option>
            <option value="blue">🔵 藍印</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 畫布核心區 (預設去背顯示，亦可切換對比；高度精簡一頁全顯) -->
    <div class="canvas-viewport" :class="bgClass">
      <!-- 空白未載入佔位符號 -->
      <div v-if="!originalImageUrl" class="empty-placeholder">
        <div class="empty-icon">🖃</div>
        <p>請先上傳相片或開啟鏡頭拍攝</p>
      </div>

      <!-- 畫布內容展示層 -->
      <div v-else class="image-stage" :style="stageTransformStyle">
        <!-- 情況 A: 純去背模式 (預設顯示) -->
        <img
          v-if="viewMode === 'extracted' && result"
          :src="result.dataUrl"
          alt="去背印章"
          class="stage-img extracted-shadow-glow"
        />

        <!-- 情況 B: 前後對比模式 (Split Slider) -->
        <div
          ref="splitContainerRef"
          v-else-if="viewMode === 'split' && result"
          class="split-container"
          @mousedown="startSplitDrag"
          @touchstart.passive="startSplitDrag"
        >
          <!-- 左側：原始圖片 (0% ~ splitPos%) -->
          <div
            class="split-layer-wrap left-original"
            :style="{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }"
          >
            <img :src="result.croppedOriginalDataUrl || originalImageUrl" alt="原始照片" class="split-layer original-layer" />
          </div>

          <!-- 右側：去背成果 (splitPos% ~ 100%) -->
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

          <!-- 浮水印標籤 -->
          <div class="split-tag tag-left" v-if="splitPos > 15">原始照片</div>
          <div class="split-tag tag-right" v-if="splitPos < 85">智慧去背</div>
        </div>
      </div>
    </div>

    <!-- 預覽最下方控制列：旋轉功能（可直接輸入角度，無 Label）與縮放調校 -->
    <div v-if="originalImageUrl" class="preview-bottom-toolbar">
      <!-- 旋轉控制群組 (可輸入角度) -->
      <div class="rotation-group">
        <button type="button" class="tool-btn rotate-btn" title="向左旋轉 90 度" @click="rotateBy(-90)">
          <span class="rotate-icon">↺</span>
          <span>90°</span>
        </button>
        <div class="angle-input-box" title="直接輸入旋轉角度 (0° ~ 360°)">
          <input
            type="number"
            min="0"
            max="360"
            :value="currentOptions.rotation || 0"
            class="angle-num-input"
            @input="onAngleInput"
          />
          <span class="deg-sym">°</span>
        </div>
        <button type="button" class="tool-btn rotate-btn" title="向右旋轉 90 度" @click="rotateBy(90)">
          <span class="rotate-icon">↻</span>
          <span>90°</span>
        </button>
      </div>

      <!-- 縮放控制群組 -->
      <div class="zoom-group">
        <button class="tool-btn" @click="zoomOut" title="縮小">－</button>
        <span class="zoom-val">{{ Math.round(zoomScale * 100) }}%</span>
        <button class="tool-btn" @click="zoomIn" title="放大">＋</button>
      </div>
    </div>

    <!-- 底部下載主行動列 -->
    <div class="export-actions-row">
      <button class="btn btn-primary btn-download" :disabled="!result" @click="downloadPng">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>下載透明 PNG (無損 32-bit)</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import confetti from 'canvas-confetti';
import type { StampOptions, ProcessedStampResult, PreviewBackground } from '../types/stamp';

const props = withDefaults(
  defineProps<{
    originalImageUrl: string;
    result: ProcessedStampResult | null;
    currentOptions: StampOptions;
    autoDownloadOnExport?: boolean;
  }>(),
  {
    autoDownloadOnExport: true
  }
);

const emit = defineEmits<{
  (e: 'update:rotation', angle: number): void;
  (e: 'rotate', angle: number): void;
  (e: 'update:colorMode', mode: 'red' | 'blue'): void;
  (e: 'update:color-mode', mode: 'red' | 'blue'): void;
  (e: 'export', result: ProcessedStampResult): void;
}>();

// 預設為純去背顯示
const viewMode = ref<'extracted' | 'split'>('extracted');

// 當上傳或拍照載入新相片時，預設切回「去背」顯示
watch(
  () => props.originalImageUrl,
  () => {
    viewMode.value = 'extracted';
  }
);

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

const onAngleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  let val = Number(target.value) || 0;
  val = ((val % 360) + 360) % 360;
  emit('update:rotation', val);
  emit('rotate', val);
};

const onColorChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  const mode = target.value as 'red' | 'blue';
  emit('update:colorMode', mode);
  emit('update:color-mode', mode);
};

// 預覽保留棋盤透明底色與純去背顯示
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
  if (props.autoDownloadOnExport !== false) {
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
  }

  emit('export', props.result);
};

onBeforeUnmount(() => {
  stopSplitDrag();
});
</script>

<style scoped>
.preview-card {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 頂部精簡資訊列 */
.preview-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 下拉式印章顏色選擇器 */
.color-select-wrapper {
  display: flex;
  align-items: center;
}

.stamp-color-select {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: var(--text-primary);
  font-size: 0.775rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.stamp-color-select:hover,
.stamp-color-select:focus {
  border-color: #00653e;
  background: #f8fafc;
}

/* 畫布核心區 (降低高度以優化工作台視野) */
.canvas-viewport {
  position: relative;
  width: 100%;
  height: 330px;
  min-height: 280px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.05);
}

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 2.2rem;
  opacity: 0.4;
}

.image-stage {
  max-width: 95%;
  max-height: 95%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-img {
  max-width: 100%;
  max-height: 290px;
  object-fit: contain;
}

.extracted-shadow-glow {
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.45));
}

/* 前後對比 Split Slider */
.split-container {
  position: relative;
  display: inline-block;
  max-height: 290px;
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
  max-height: 290px;
  max-width: 100%;
  object-fit: contain;
}

.split-divider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.9);
  pointer-events: none;
}

.split-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background: #ef4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 9px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.split-tag {
  position: absolute;
  bottom: 8px;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  font-size: 0.675rem;
  font-weight: 700;
  pointer-events: none;
}
.tag-left { left: 8px; background: rgba(0, 0, 0, 0.7); color: white; }
.tag-right { right: 8px; background: rgba(239, 68, 68, 0.85); color: white; }

/* 預覽最下方控制列 (旋轉與縮放，無 Label，可輸入角度) */
.preview-bottom-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.rotation-group,
.zoom-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 調大旋轉按鍵 (Rotate Buttons) */
.rotate-btn {
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  gap: 5px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all var(--transition-fast);
}

.rotate-btn:hover {
  background: rgba(0, 101, 62, 0.08);
  border-color: #00653e;
  color: #00653e;
  box-shadow: 0 2px 8px rgba(0, 101, 62, 0.2);
  transform: translateY(-1px);
}

.rotate-btn:active {
  transform: translateY(0);
}

.rotate-icon {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1;
}

/* 旋轉角度數值輸入框 - 調大以配合按鍵高度 */
.angle-input-box {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 101, 62, 0.06);
  border: 1px solid rgba(0, 101, 62, 0.25);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  height: 32px;
}

.angle-num-input {
  width: 40px;
  background: transparent;
  border: none;
  color: #00653e;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: right;
  outline: none;
  font-family: inherit;
}

.angle-num-input::-webkit-inner-spin-button,
.angle-num-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.deg-sym {
  font-size: 0.85rem;
  font-weight: 700;
  color: #00653e;
  margin-left: 2px;
}

.reset-angle-btn {
  padding: 6px 10px;
  font-size: 0.9rem;
  height: 32px;
}

.tool-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: var(--text-secondary);
  font-size: 0.725rem;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: #f1f5f9;
  color: var(--text-primary);
  border-color: #94a3b8;
}

/* 縮放按鍵寬度加長與質感提升 */
.zoom-group .tool-btn {
  min-width: 44px;
  padding: 5px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  height: 32px;
}

.zoom-group .tool-btn:hover {
  background: rgba(0, 101, 62, 0.08);
  border-color: #00653e;
  color: #00653e;
}

.zoom-val {
  min-width: 48px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  padding: 4px 8px;
  background: #ffffff;
  border-radius: var(--radius-sm);
  border: 1px solid #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
}

/* 匯出動作按鈕 */
.export-actions-row {
  display: flex;
  width: 100%;
}

.btn-download {
  width: 100%;
  padding: 10px 16px;
  font-size: 0.925rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 14px var(--accent-red-glow);
}

/* Responsive Media Queries */
@media (max-width: 1024px) {
  .canvas-viewport {
    height: 280px;
    min-height: 240px;
  }

  .stage-img,
  .split-container,
  .split-layer {
    max-height: 250px;
  }
}

@media (max-width: 640px) {
  .canvas-viewport {
    height: 230px;
    min-height: 190px;
  }

  .stage-img,
  .split-container,
  .split-layer {
    max-height: 200px;
  }

  .preview-bottom-toolbar {
    padding: 5px 8px;
  }

  .rotate-btn {
    padding: 5px 10px;
    font-size: 0.775rem;
  }

  .angle-input-box {
    padding: 2px 6px;
    height: 28px;
  }

  .angle-num-input {
    width: 34px;
    font-size: 0.775rem;
  }

  .reset-angle-btn {
    padding: 5px 8px;
    height: 28px;
  }

  .rotation-group,
  .zoom-group {
    gap: 4px;
  }

  .tool-btn {
    padding: 3px 5px;
    font-size: 0.7rem;
  }

  .btn-download {
    padding: 9px 12px;
    font-size: 0.875rem;
  }
}
</style>

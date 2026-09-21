<template>
  <div class="stampvue-workbench-root">
    <div class="workbench-grid">
      <!-- 1. 影像來源 (上傳/拍攝) -->
      <div class="source-slot">
        <CameraCapture
          :has-image="!!originalImageUrl"
          @image-loaded="handleImageLoaded"
          @imageLoaded="handleImageLoaded"
        />
      </div>

      <!-- 2. 去背微調控制板 -->
      <div class="controls-slot">
        <StampControls
          v-model="stampOptions"
          @change="triggerProcessing"
        />
      </div>

      <!-- 3. 大圖預覽與匯出操作 (Hero Canvas) -->
      <div class="preview-slot">
        <ImagePreview
          :original-image-url="originalImageUrl"
          :result="processedResult"
          :current-options="stampOptions"
          :auto-download-on-export="autoDownloadOnExport"
          @update:rotation="handleRotationChange"
          @rotate="handleRotationChange"
          @update:color-mode="handleColorModeChange"
          @export="handleExport"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import CameraCapture from './CameraCapture.vue';
import StampControls from './StampControls.vue';
import ImagePreview from './ImagePreview.vue';
import { StampProcessor } from '../utils/stampProcessor';
import type { StampOptions, ProcessedStampResult } from '../types/stamp';

const props = withDefaults(
  defineProps<{
    initialImage?: string;
    showSampleOnMount?: boolean;
    autoDownloadOnExport?: boolean;
  }>(),
  {
    initialImage: '',
    showSampleOnMount: false,
    autoDownloadOnExport: true
  }
);

const emit = defineEmits<{
  (e: 'export', result: ProcessedStampResult): void;
  (e: 'change', result: ProcessedStampResult | null): void;
}>();

const originalImageUrl = ref<string>('');
const processedResult = ref<ProcessedStampResult | null>(null);

const stampOptions = ref<StampOptions>({
  colorMode: 'red',
  threshold: 40,
  shadowSuppression: 40,
  smoothness: 0,
  colorBoost: 25,
  autoCrop: true,
  padding: 16,
  rotation: 0,
  sourceType: 'upload'
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentImgElement: HTMLImageElement | null = null;
let userManuallySelectedColor = false;

// 依據印章墨色自動切換最佳預設去背參數
const applyDefaultOptionsForColor = (color: 'red' | 'blue') => {
  if (color === 'blue') {
    // 藍印最佳實踐配置：陰影抑制 35%、去背強度 20%（兼顧淡藍印泥保留與冷光白紙徹底去背）
    stampOptions.value.shadowSuppression = 35;
    stampOptions.value.threshold = 20;
  } else {
    // 紅印標準配置：陰影抑制 40%、去背強度 40%
    stampOptions.value.shadowSuppression = 40;
    stampOptions.value.threshold = 40;
  }
};

const handleImageLoaded = (dataUrl: string, source: 'camera' | 'upload' = 'upload') => {
  stampOptions.value.sourceType = source;
  originalImageUrl.value = dataUrl;
  userManuallySelectedColor = false;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    currentImgElement = img;
    // 自動印章色彩偵測：若偵測為藍印，立即改為「藍印」並套用藍印預設參數
    const detected = StampProcessor.detectImageColor(img);
    stampOptions.value.colorMode = detected;
    applyDefaultOptionsForColor(detected);
    runProcessing();
  };
  img.src = dataUrl;
};

const triggerProcessing = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runProcessing();
  }, 30);
};

const handleRotationChange = (angle: number) => {
  stampOptions.value.rotation = angle;
  triggerProcessing();
};

const handleColorModeChange = (mode: 'red' | 'blue') => {
  userManuallySelectedColor = true;
  stampOptions.value.colorMode = mode;
  applyDefaultOptionsForColor(mode);
  triggerProcessing();
};

const handleExport = (result: ProcessedStampResult) => {
  emit('export', result);
};

const runProcessing = async () => {
  if (!currentImgElement) return;
  try {
    const res = await StampProcessor.processImage(currentImgElement, stampOptions.value);
    processedResult.value = res;
    emit('change', res);
    // 若影像處理偵測出為藍印，且目前仍為紅印且未手動指定，立即改為「藍印」並以藍印預設參數重繪
    if (res.detectedColor === 'blue' && stampOptions.value.colorMode !== 'blue' && !userManuallySelectedColor) {
      stampOptions.value.colorMode = 'blue';
      applyDefaultOptionsForColor('blue');
      const blueRes = await StampProcessor.processImage(currentImgElement, stampOptions.value);
      processedResult.value = blueRes;
      emit('change', blueRes);
    }
  } catch (err) {
    console.error('處理失敗:', err);
  }
};

watch(
  () => props.initialImage,
  (newVal) => {
    if (newVal) {
      handleImageLoaded(newVal);
    }
  }
);

onMounted(() => {
  if (props.initialImage) {
    handleImageLoaded(props.initialImage);
  } else if (props.showSampleOnMount) {
    // 載入預設真實範例：白紙紅印 + 重度手機陰影
    const initialSample = StampProcessor.generateRealisticSample('red_shadow');
    handleImageLoaded(initialSample);
  }
});
</script>

<style scoped>
.stampvue-workbench-root {
  width: 100%;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "source  preview"
    "controls preview";
  gap: 12px;
  align-items: start;
}

.source-slot {
  grid-area: source;
}

.controls-slot {
  grid-area: controls;
}

.preview-slot {
  grid-area: preview;
}

/* Responsive Studio Layout */
@media (max-width: 1024px) {
  .workbench-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "source"
      "preview"
      "controls";
    gap: 8px;
  }
}
</style>

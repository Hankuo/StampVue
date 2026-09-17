<template>
  <div class="app-shell">
    <!-- 主要內容區 (Streamlined Workbench Layout) -->
    <main class="main-content">
      <div class="workbench-grid">
        <!-- 1. 影像來源 (上傳/拍攝) -->
        <div class="source-slot">
          <CameraCapture
            :has-image="!!originalImageUrl"
            @image-loaded="handleImageLoaded"
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
            @update:rotation="handleRotationChange"
            @rotate="handleRotationChange"
            @update:color-mode="handleColorModeChange"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import CameraCapture from './components/CameraCapture.vue';
import StampControls from './components/StampControls.vue';
import ImagePreview from './components/ImagePreview.vue';
import { StampProcessor } from './utils/stampProcessor';
import type { StampOptions, ProcessedStampResult } from './types/stamp';

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

const handleImageLoaded = (dataUrl: string, source: 'camera' | 'upload' = 'upload') => {
  stampOptions.value.sourceType = source;
  originalImageUrl.value = dataUrl;
  userManuallySelectedColor = false;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    currentImgElement = img;
    // 自動印章色彩偵測：若偵測為藍印，立即改為「藍印」
    const detected = StampProcessor.detectImageColor(img);
    stampOptions.value.colorMode = detected;
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
  triggerProcessing();
};

const runProcessing = async () => {
  if (!currentImgElement) return;
  try {
    const res = await StampProcessor.processImage(currentImgElement, stampOptions.value);
    processedResult.value = res;
    // 若影像處理偵測出為藍印，且目前仍為紅印且未手動指定，立即改為「藍印」並以藍印模式重繪
    if (res.detectedColor === 'blue' && stampOptions.value.colorMode !== 'blue' && !userManuallySelectedColor) {
      stampOptions.value.colorMode = 'blue';
      const blueRes = await StampProcessor.processImage(currentImgElement, stampOptions.value);
      processedResult.value = blueRes;
    }
  } catch (err) {
    console.error('處理失敗:', err);
  }
};

onMounted(() => {
  // 載入預設真實範例：白紙紅印 + 重度手機陰影
  const initialSample = StampProcessor.generateRealisticSample('red_shadow');
  handleImageLoaded(initialSample);
});
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  justify-content: center;
}

/* Main Studio Layout */
.main-content {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 12px 18px;
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
  .app-shell {
    justify-content: flex-start;
  }

  .main-content {
    padding: 8px 10px;
  }

  .workbench-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "source"
      "preview"
      "controls";
    gap: 8px;
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: 6px 6px;
  }
}
</style>

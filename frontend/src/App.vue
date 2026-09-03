<template>
  <div class="app-shell">
    <!-- 頂部導航欄 (Navigation Header) -->
    <header class="app-header">
      <div class="header-container">
        <div class="brand-group">
          <div class="logo-seal">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">StampVue</h1>
            <span class="brand-tagline">印章拍照擷取與智慧去背系統 (支援紙張手機陰影消除)</span>
          </div>
        </div>

        <div class="header-badges">
          <span class="engine-badge">
            <span class="status-pulse"></span>
            純前端 Canvas 60fps 即時處理 (100% Client Engine)
          </span>
          <span class="sdlc-badge" title="遵循 AGENTS.md 嚴謹 SDLC 軟體工程規範">
            SDLC v1.0
          </span>
        </div>
      </div>
    </header>

    <!-- 主要內容區 (Main Content Layout) -->
    <main class="main-content">
      <div class="workbench-grid">
        <!-- 左側欄位：取得圖片與微調面板 -->
        <div class="sidebar-column">
          <CameraCapture @image-loaded="handleImageLoaded" />
          <StampControls
            v-model="stampOptions"
            @change="triggerProcessing"
          />
        </div>

        <!-- 右側欄位：大圖預覽與匯出操作 -->
        <div class="preview-column">
          <ImagePreview
            :original-image-url="originalImageUrl"
            :result="processedResult"
            :current-options="stampOptions"
            @update:rotation="handleRotationChange"
            @rotate="handleRotationChange"
          />
        </div>
      </div>
    </main>

    <!-- 底部資訊列 (Footer) -->
    <footer class="app-footer">
      <div class="footer-inner">
        <span>© 2026 StampVue · 基于色彩對立色度差 (Color-Opponent Chromaticity) 與自適應陰影抑制演算法</span>
        <span class="footer-links">
          <span>Vue 3 + Vite + TypeScript (純前端隱私去背)</span>
        </span>
      </div>
    </footer>
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
  colorMode: 'auto',
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

const handleImageLoaded = (dataUrl: string, source: 'camera' | 'upload' = 'upload') => {
  stampOptions.value.sourceType = source;
  originalImageUrl.value = dataUrl;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    currentImgElement = img;
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

const runProcessing = async () => {
  if (!currentImgElement) return;
  try {
    const res = await StampProcessor.processImage(currentImgElement, stampOptions.value);
    processedResult.value = res;
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
}

/* Header */
.app-header {
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-seal {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--accent-red-glow);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tagline {
  font-size: 0.775rem;
  color: var(--text-muted);
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 10px;
}

.engine-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid var(--border-subtle);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  color: #38bdf8;
}

.status-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

.sdlc-badge {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
}

/* Main */
.main-content {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 24px;
  align-items: start;
}

.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Footer */
.app-footer {
  border-top: 1px solid var(--border-subtle);
  background: rgba(15, 23, 42, 0.6);
  padding: 16px 24px;
  margin-top: auto;
}

.footer-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.775rem;
  color: var(--text-muted);
}

.footer-links {
  display: flex;
  gap: 8px;
}

/* Responsive Media Queries */
@media (max-width: 1024px) {
  .header-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .workbench-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: 14px 12px;
  }

  .brand-title {
    font-size: 1.25rem;
  }

  .brand-tagline {
    font-size: 0.725rem;
  }

  .header-badges {
    flex-wrap: wrap;
  }

  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

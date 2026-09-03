<template>
  <div class="camera-capture-card glass-panel">
    <div class="capture-header">
      <div class="title-wrap">
        <span class="step-badge">1</span>
        <h3>取得印章影像</h3>
      </div>
      <span class="sub-tip">支援照片檔案上傳、拖曳上傳或即時視訊鏡頭拍照</span>
    </div>

    <!-- 檔案上傳與即時鏡頭拍攝區域 -->
    <div
      class="dropzone"
      :class="{ 'is-dragging': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden-input"
        @change="handleFileSelect"
      />

      <div class="dropzone-content">
        <div class="action-buttons-group">
          <!-- 檔案上傳按鈕 -->
          <button class="btn btn-primary" type="button" @click.stop="triggerUpload">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            選擇照片檔案
          </button>

          <!-- 視訊鏡頭 Live 拍照 (Desktop / Mobile WebRTC) -->
          <button class="btn btn-secondary" type="button" @click.stop="openLiveCamera">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            即時視訊拍攝
          </button>
        </div>

        <p class="dropzone-hint">或將紙張印章相片直接拖曳至此處上傳</p>
      </div>
    </div>

    <!-- WebRTC 即時鏡頭 Modal (以 Teleport 掛載於 body 避免 Event Trapping 與 z-index 遮蔽) -->
    <Teleport to="body">
      <div v-if="isLiveCameraOpen" class="live-camera-modal">
        <div class="modal-backdrop" @click.stop="closeLiveCamera"></div>
        <div class="modal-card glass-panel">
          <div class="modal-header">
            <div class="modal-title-row">
              <h4>即時鏡頭取景</h4>
              <span class="crop-guide-tip">依紅框精準裁切</span>
            </div>
            <button class="close-btn" type="button" @click.stop="closeLiveCamera">✕</button>
          </div>

          <!-- 裁切框尺寸快速調整 -->
          <div class="crop-size-toolbar">
            <span class="toolbar-label">裁切框尺寸:</span>
            <div class="size-btn-group">
              <button
                type="button"
                class="size-btn"
                :class="{ active: cropSize === 200 }"
                @click.stop="cropSize = 200"
              >
                標準 (200px)
              </button>
              <button
                type="button"
                class="size-btn"
                :class="{ active: cropSize === 260 }"
                @click.stop="cropSize = 260"
              >
                中等 (260px)
              </button>
              <button
                type="button"
                class="size-btn"
                :class="{ active: cropSize === 320 }"
                @click.stop="cropSize = 320"
              >
                大印章 (320px)
              </button>
            </div>
          </div>

          <!-- 視訊與取景裁切框 -->
          <div ref="videoContainerRef" class="video-container">
            <video ref="videoRef" autoplay playsinline class="camera-stream"></video>
            <div
              ref="crosshairRef"
              class="crosshair-guide"
              :style="{ width: `${cropSize}px`, height: `${cropSize}px` }"
            >
              <div class="corner corner-tl"></div>
              <div class="corner corner-tr"></div>
              <div class="corner corner-bl"></div>
              <div class="corner corner-br"></div>
              <div class="crosshair-center"></div>
              <span class="guide-tag">🎯 將印章置於框內</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" @click.stop="closeLiveCamera">取消</button>
            <button class="btn btn-primary btn-shutter" type="button" @click.stop.prevent="captureStreamFrame">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
              依裁切框拍照擷取
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';

const emit = defineEmits<{
  (e: 'imageLoaded', dataUrl: string, source: 'camera' | 'upload'): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const videoContainerRef = ref<HTMLDivElement | null>(null);
const crosshairRef = ref<HTMLDivElement | null>(null);
const cropSize = ref<number>(240);
const isDragging = ref<boolean>(false);
const isLiveCameraOpen = ref<boolean>(false);
let mediaStream: MediaStream | null = null;

const triggerUpload = () => fileInputRef.value?.click();

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) readFile(file);
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    readFile(file);
  }
};

const readFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result;
    if (typeof dataUrl === 'string') {
      emit('imageLoaded', dataUrl, 'upload');
    }
  };
  reader.readAsDataURL(file);
};

const openLiveCamera = async () => {
  isLiveCameraOpen.value = true;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    setTimeout(() => {
      if (videoRef.value && mediaStream) {
        videoRef.value.srcObject = mediaStream;
      }
    }, 100);
  } catch (err) {
    alert('無法存取攝影機鏡頭，請檢查瀏覽器權限或使用相簿上傳。');
    closeLiveCamera();
  }
};

const closeLiveCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  isLiveCameraOpen.value = false;
};

/**
 * 依據取景器紅框裁切視訊並發送影像
 */
const captureStreamFrame = (e?: Event) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!videoRef.value) return;
  const video = videoRef.value;
  const vW = video.videoWidth || 1280;
  const vH = video.videoHeight || 720;

  // 若有取景器容器與裁切框，精準映射裁切框至視訊原始解析度座標
  if (videoContainerRef.value && crosshairRef.value) {
    const containerRect = videoContainerRef.value.getBoundingClientRect();
    const boxRect = crosshairRef.value.getBoundingClientRect();

    const cW = containerRect.width;
    const cH = containerRect.height;

    if (cW > 0 && cH > 0 && boxRect.width > 0 && boxRect.height > 0) {
      // 計算 object-fit: cover 之縮放比與中心偏移量
      const scale = Math.max(cW / vW, cH / vH);
      const renderedW = vW * scale;
      const renderedH = vH * scale;
      const offsetX = (cW - renderedW) / 2;
      const offsetY = (cH - renderedH) / 2;

      // 裁切框相對於容器的頂左位移
      const boxX = boxRect.left - containerRect.left;
      const boxY = boxRect.top - containerRect.top;

      // 映射還原至視訊原始畫素座標
      let cropX = (boxX - offsetX) / scale;
      let cropY = (boxY - offsetY) / scale;
      let cropW = boxRect.width / scale;
      let cropH = boxRect.height / scale;

      // 邊界防護與範圍鉗位
      cropX = Math.max(0, Math.min(vW - 1, cropX));
      cropY = Math.max(0, Math.min(vH - 1, cropY));
      cropW = Math.max(10, Math.min(cropW, vW - cropX));
      cropH = Math.max(10, Math.min(cropH, vH - cropY));

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropW);
      canvas.height = Math.round(cropH);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          video,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          canvas.width,
          canvas.height
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
        emit('imageLoaded', dataUrl, 'camera');
      }
      closeLiveCamera();
      return;
    }
  }

  // 後備 fallback: 全幅擷取
  const canvas = document.createElement('canvas');
  canvas.width = vW;
  canvas.height = vH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    emit('imageLoaded', dataUrl, 'camera');
  }
  closeLiveCamera();
};

onBeforeUnmount(() => {
  closeLiveCamera();
});
</script>

<style scoped>
.camera-capture-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.capture-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.capture-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.sub-tip {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-left: 34px;
}

.hidden-input {
  display: none;
}

/* Dropzone 檔案拖曳與選擇區 */
.dropzone {
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  padding: 24px 16px;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
  transition: all var(--transition-medium);
}

.dropzone:hover,
.dropzone.is-dragging {
  border-color: var(--accent-red);
  background: rgba(239, 68, 68, 0.08);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.action-buttons-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.action-buttons-group .btn {
  flex: 1;
  min-width: 140px;
}

.dropzone-hint {
  font-size: 0.825rem;
  color: var(--text-muted);
}
</style>

<style>
/* WebRTC 即時鏡頭 Modal (全局獨立掛載於 Body) */
.live-camera-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-camera-modal .modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
}

.live-camera-modal .modal-card {
  position: relative;
  width: 90%;
  max-width: 600px;
  padding: 20px;
  z-index: 1000000;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: var(--radius-lg);
}

.live-camera-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.live-camera-modal .modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-camera-modal .modal-header h4 {
  font-size: 1.1rem;
  font-weight: 700;
}

.live-camera-modal .crop-guide-tip {
  font-size: 0.75rem;
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
}

.live-camera-modal .close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
}

.live-camera-modal .close-btn:hover {
  color: var(--text-primary);
}

/* 裁切框尺寸調整工具列 */
.live-camera-modal .crop-size-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.35);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.live-camera-modal .toolbar-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.live-camera-modal .size-btn-group {
  display: flex;
  gap: 6px;
}

.live-camera-modal .size-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.live-camera-modal .size-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.live-camera-modal .size-btn.active {
  background: var(--accent-red);
  color: white;
  border-color: var(--accent-red);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

.live-camera-modal .video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: black;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.live-camera-modal .camera-stream {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 裁切取景框本體 (外圈反白遮罩 + 4 角瞄準標記) */
.live-camera-modal .crosshair-guide {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px dashed rgba(239, 68, 68, 0.85);
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.52);
  pointer-events: none;
  transition: width 0.2s ease, height 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 4 個角的精準金屬瞄準直角標記 */
.live-camera-modal .crosshair-guide .corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: #ef4444;
  border-style: solid;
}

.live-camera-modal .crosshair-guide .corner-tl {
  top: -2px;
  left: -2px;
  border-width: 3px 0 0 3px;
  border-top-left-radius: 6px;
}

.live-camera-modal .crosshair-guide .corner-tr {
  top: -2px;
  right: -2px;
  border-width: 3px 3px 0 0;
  border-top-right-radius: 6px;
}

.live-camera-modal .crosshair-guide .corner-bl {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 3px 3px;
  border-bottom-left-radius: 6px;
}

.live-camera-modal .crosshair-guide .corner-br {
  bottom: -2px;
  right: -2px;
  border-width: 0 3px 3px 0;
  border-bottom-right-radius: 6px;
}

/* 中心準星微點 */
.live-camera-modal .crosshair-center {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.9);
}

/* 提示文字 */
.live-camera-modal .guide-tag {
  position: absolute;
  bottom: 8px;
  font-size: 0.725rem;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  letter-spacing: 0.5px;
}

.live-camera-modal .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  z-index: 1000001;
  position: relative;
}

.live-camera-modal .btn-shutter {
  cursor: pointer !important;
  pointer-events: auto !important;
}
</style>

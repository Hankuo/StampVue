<template>
  <div class="camera-capture-root">
    <!-- 隱藏原生檔案選擇器 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileSelect"
    />

    <div
      class="camera-capture-card glass-panel"
      :class="{ 'is-dragging': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- 雙核心主要操作按鍵 (選擇照片 / 拍照) -->
      <div class="source-action-grid">
        <!-- 選擇照片：鮮紅印鑑主題色，高對比立體發光按鍵 -->
        <button
          class="source-hero-btn btn-upload-hero"
          type="button"
          title="從電腦或手機相簿選取照片檔案"
          @click.stop="triggerUpload"
        >
          <div class="btn-icon-bubble">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="btn-text-wrap">
            <span class="btn-title-main">選擇照片</span>
            <span class="btn-sub-label">相簿 / 檔案</span>
          </div>
        </button>

        <!-- 拍照：科技相機藍主題色，高對比立體發光按鍵 -->
        <button
          class="source-hero-btn btn-camera-hero"
          type="button"
          title="開啟視訊鏡頭進行即時取景拍照"
          @click.stop="openLiveCamera"
        >
          <div class="btn-icon-bubble">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div class="btn-text-wrap">
            <span class="btn-title-main">拍照</span>
            <span class="btn-sub-label">鏡頭拍攝</span>
          </div>
        </button>
      </div>
    </div>

    <!-- WebRTC 即時鏡頭 Modal (以 fixed 定位全螢幕呈現) -->
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
                :class="{ active: cropSize === 140 }"
                @click.stop="cropSize = 140"
              >
                小印 (140px)
              </button>
              <button
                type="button"
                class="size-btn"
                :class="{ active: cropSize === 180 }"
                @click.stop="cropSize = 180"
              >
                標準 (180px)
              </button>
              <button
                type="button"
                class="size-btn"
                :class="{ active: cropSize === 220 }"
                @click.stop="cropSize = 220"
              >
                大印 (220px)
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
              拍照
            </button>
          </div>
        </div>
      </div>

    <!-- 相片檔案上傳後之互動裁切取景 Modal (以 fixed 定位全螢幕呈現) -->
    <div v-if="isUploadCropperOpen" class="live-camera-modal upload-cropper-modal">
        <div class="modal-backdrop" @click.stop="closeUploadCropper"></div>
        <div class="modal-card glass-panel">
          <div class="modal-header">
            <div class="modal-title-row">
              <h4>裁切印章</h4>
            </div>
            <button class="close-btn" type="button" @click.stop="closeUploadCropper">✕</button>
          </div>

          <!-- 尺寸與縮放工具列 (支援裁切框尺寸與照片縮放微調) -->
          <div class="crop-size-toolbar">
            <!-- 1. 裁切框尺寸與縮放按鍵 -->
            <div class="toolbar-section">
              <span class="toolbar-label">裁切框:</span>
              <div class="size-btn-group">
                <button
                  type="button"
                  class="size-btn step-btn"
                  title="縮小裁切框 (-20px)"
                  @click.stop="zoomCropBox(-20)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  縮小
                </button>
                <button
                  type="button"
                  class="size-btn"
                  :class="{ active: Math.round(uploadCropSize) === 140 }"
                  @click.stop="uploadCropSize = 140"
                >
                  140px
                </button>
                <button
                  type="button"
                  class="size-btn"
                  :class="{ active: Math.round(uploadCropSize) === 180 }"
                  @click.stop="uploadCropSize = 180"
                >
                  180px
                </button>
                <button
                  type="button"
                  class="size-btn"
                  :class="{ active: Math.round(uploadCropSize) === 240 }"
                  @click.stop="uploadCropSize = 240"
                >
                  240px
                </button>
                <button
                  type="button"
                  class="size-btn step-btn"
                  title="放大裁切框 (+20px)"
                  @click.stop="zoomCropBox(20)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  放大
                </button>
              </div>
            </div>

            <!-- 2. 照片視角縮放按鍵 -->
            <div class="toolbar-section">
              <span class="toolbar-label">照片縮放:</span>
              <div class="size-btn-group image-zoom-group">
                <button
                  type="button"
                  class="size-btn step-btn"
                  title="縮小照片視角 (-20%)"
                  :disabled="uploadImageZoom <= 0.5"
                  @click.stop="zoomUploadImage(-0.2)"
                >
                  －
                </button>
                <span class="zoom-indicator">{{ Math.round(uploadImageZoom * 100) }}%</span>
                <button
                  type="button"
                  class="size-btn step-btn"
                  title="放大照片視角 (+20%)"
                  :disabled="uploadImageZoom >= 3.0"
                  @click.stop="zoomUploadImage(0.2)"
                >
                  ＋
                </button>
                <button
                  type="button"
                  class="size-btn step-btn"
                  title="重設照片縮放 (100%)"
                  @click.stop="resetUploadImageZoom"
                >
                  ⟲
                </button>
              </div>
            </div>
          </div>

          <!-- 圖片容器與可拖曳紅框 (支援四角與邊框等比正方形縮放) -->
          <div
            ref="uploadContainerRef"
            class="video-container upload-crop-stage"
            @mousedown="startCropDrag"
            @touchstart="startCropDrag"
          >
            <img
              ref="uploadImgRef"
              :src="rawUploadDataUrl"
              alt="待裁切照片"
              class="upload-crop-img"
              :style="{
                transform: `scale(${uploadImageZoom})`,
                transition: 'transform 0.15s ease'
              }"
              draggable="false"
            />
            <div
              ref="uploadCropBoxRef"
              class="crosshair-guide upload-draggable-box"
              :style="{
                width: `${uploadCropSize}px`,
                height: `${uploadCropSize}px`,
                transform: `translate(calc(-50% + ${uploadCropPos.x}px), calc(-50% + ${uploadCropPos.y}px))`
              }"
              @mousedown.stop="startCropDrag"
              @touchstart.stop="startCropDrag"
            >
              <!-- 4 條邊框縮放把手 -->
              <div class="resize-edge edge-t" @mousedown.stop="startResizeDrag($event, 't')" @touchstart.stop="startResizeDrag($event, 't')"></div>
              <div class="resize-edge edge-b" @mousedown.stop="startResizeDrag($event, 'b')" @touchstart.stop="startResizeDrag($event, 'b')"></div>
              <div class="resize-edge edge-l" @mousedown.stop="startResizeDrag($event, 'l')" @touchstart.stop="startResizeDrag($event, 'l')"></div>
              <div class="resize-edge edge-r" @mousedown.stop="startResizeDrag($event, 'r')" @touchstart.stop="startResizeDrag($event, 'r')"></div>

              <!-- 4 個角落縮放把手 (兼瞄準標記) -->
              <div class="corner corner-tl" @mousedown.stop="startResizeDrag($event, 'tl')" @touchstart.stop="startResizeDrag($event, 'tl')"></div>
              <div class="corner corner-tr" @mousedown.stop="startResizeDrag($event, 'tr')" @touchstart.stop="startResizeDrag($event, 'tr')"></div>
              <div class="corner corner-bl" @mousedown.stop="startResizeDrag($event, 'bl')" @touchstart.stop="startResizeDrag($event, 'bl')"></div>
              <div class="corner corner-br" @mousedown.stop="startResizeDrag($event, 'br')" @touchstart.stop="startResizeDrag($event, 'br')"></div>

              <div class="crosshair-center"></div>
              <span class="guide-tag">🎯 移動 / 邊角縮放 ({{ Math.round(uploadCropSize) }}px)</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" @click.stop="closeUploadCropper">
              取消
            </button>
            <button class="btn btn-primary btn-shutter" type="button" @click.stop.prevent="confirmUploadCrop">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              裁切
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';

withDefaults(
  defineProps<{
    hasImage?: boolean;
  }>(),
  {
    hasImage: false
  }
);

const emit = defineEmits<{
  (e: 'imageLoaded', dataUrl: string, source: 'camera' | 'upload'): void;
  (e: 'image-loaded', dataUrl: string, source: 'camera' | 'upload'): void;
}>();

const emitImageLoaded = (dataUrl: string, source: 'camera' | 'upload') => {
  emit('imageLoaded', dataUrl, source);
  emit('image-loaded', dataUrl, source);
};

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const videoContainerRef = ref<HTMLDivElement | null>(null);
const crosshairRef = ref<HTMLDivElement | null>(null);
const cropSize = ref<number>(180);
const isDragging = ref<boolean>(false);
const isLiveCameraOpen = ref<boolean>(false);
let mediaStream: MediaStream | null = null;

// 上傳相片裁切取景狀態
const isUploadCropperOpen = ref<boolean>(false);
const rawUploadDataUrl = ref<string>('');
const uploadCropSize = ref<number>(180);
const uploadCropPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const uploadImageZoom = ref<number>(1);
const uploadContainerRef = ref<HTMLDivElement | null>(null);
const uploadImgRef = ref<HTMLImageElement | null>(null);
const uploadCropBoxRef = ref<HTMLDivElement | null>(null);

const zoomCropBox = (delta: number) => {
  uploadCropSize.value = Math.max(50, Math.min(600, Math.round(uploadCropSize.value + delta)));
};

const zoomUploadImage = (delta: number) => {
  uploadImageZoom.value = Math.max(0.5, Math.min(3.0, Number((uploadImageZoom.value + delta).toFixed(2))));
};

const resetUploadImageZoom = () => {
  uploadImageZoom.value = 1;
};

let isDraggingUploadCrop = false;
let dragStartX = 0;
let dragStartY = 0;
let initialCropX = 0;
let initialCropY = 0;

type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
let isResizingCrop = false;
let activeResizeHandle: ResizeHandle | null = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeInitialSize = 180;
let resizeInitialPosX = 0;
let resizeInitialPosY = 0;

const startCropDrag = (e: MouseEvent | TouchEvent) => {
  if (isResizingCrop) return;
  isDraggingUploadCrop = true;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  dragStartX = clientX;
  dragStartY = clientY;
  initialCropX = uploadCropPos.value.x;
  initialCropY = uploadCropPos.value.y;

  window.addEventListener('mousemove', onCropDragMove);
  window.addEventListener('mouseup', stopCropDrag);
  window.addEventListener('touchmove', onCropDragMove, { passive: false });
  window.addEventListener('touchend', stopCropDrag);
};

const onCropDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDraggingUploadCrop) return;
  if ('touches' in e) e.preventDefault();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const dx = clientX - dragStartX;
  const dy = clientY - dragStartY;

  uploadCropPos.value = {
    x: initialCropX + dx,
    y: initialCropY + dy
  };
};

const stopCropDrag = () => {
  isDraggingUploadCrop = false;
  window.removeEventListener('mousemove', onCropDragMove);
  window.removeEventListener('mouseup', stopCropDrag);
  window.removeEventListener('touchmove', onCropDragMove);
  window.removeEventListener('touchend', stopCropDrag);
};

const startResizeDrag = (e: MouseEvent | TouchEvent, handle: ResizeHandle) => {
  e.stopPropagation();
  if ('touches' in e) e.preventDefault();
  isResizingCrop = true;
  activeResizeHandle = handle;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  resizeStartX = clientX;
  resizeStartY = clientY;
  resizeInitialSize = uploadCropSize.value;
  resizeInitialPosX = uploadCropPos.value.x;
  resizeInitialPosY = uploadCropPos.value.y;

  window.addEventListener('mousemove', onResizeDragMove);
  window.addEventListener('mouseup', stopResizeDrag);
  window.addEventListener('touchmove', onResizeDragMove, { passive: false });
  window.addEventListener('touchend', stopResizeDrag);
};

const onResizeDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isResizingCrop || !activeResizeHandle) return;
  if ('touches' in e) e.preventDefault();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const dx = clientX - resizeStartX;
  const dy = clientY - resizeStartY;

  let deltaSize = 0;
  let moveSignX = 0;
  let moveSignY = 0;

  switch (activeResizeHandle) {
    case 'br':
      deltaSize = (dx + dy) / 2;
      moveSignX = 1;
      moveSignY = 1;
      break;
    case 'tl':
      deltaSize = (-dx - dy) / 2;
      moveSignX = -1;
      moveSignY = -1;
      break;
    case 'tr':
      deltaSize = (dx - dy) / 2;
      moveSignX = 1;
      moveSignY = -1;
      break;
    case 'bl':
      deltaSize = (-dx + dy) / 2;
      moveSignX = -1;
      moveSignY = 1;
      break;
    case 'r':
      deltaSize = dx;
      moveSignX = 1;
      moveSignY = 1;
      break;
    case 'l':
      deltaSize = -dx;
      moveSignX = -1;
      moveSignY = -1;
      break;
    case 'b':
      deltaSize = dy;
      moveSignX = 1;
      moveSignY = 1;
      break;
    case 't':
      deltaSize = -dy;
      moveSignX = -1;
      moveSignY = -1;
      break;
  }

  // 正方形等比縮放鉗位：最小 50px，最大 600px
  const newSize = Math.max(50, Math.min(600, Math.round(resizeInitialSize + deltaSize)));
  const actualDelta = newSize - resizeInitialSize;

  uploadCropSize.value = newSize;
  uploadCropPos.value = {
    x: Math.round(resizeInitialPosX + (actualDelta / 2) * moveSignX),
    y: Math.round(resizeInitialPosY + (actualDelta / 2) * moveSignY)
  };
};

const stopResizeDrag = () => {
  isResizingCrop = false;
  activeResizeHandle = null;
  window.removeEventListener('mousemove', onResizeDragMove);
  window.removeEventListener('mouseup', stopResizeDrag);
  window.removeEventListener('touchmove', onResizeDragMove);
  window.removeEventListener('touchend', stopResizeDrag);
};

const confirmUploadCrop = () => {
  if (!uploadImgRef.value || !uploadCropBoxRef.value) {
    closeUploadCropper();
    return;
  }
  const img = uploadImgRef.value;
  const box = uploadCropBoxRef.value;

  const imgRect = img.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();

  const natW = img.naturalWidth;
  const natH = img.naturalHeight;

  if (imgRect.width === 0 || imgRect.height === 0 || natW === 0 || natH === 0) {
    closeUploadCropper();
    return;
  }

  const scaleX = natW / imgRect.width;
  const scaleY = natH / imgRect.height;

  const relX = boxRect.left - imgRect.left;
  const relY = boxRect.top - imgRect.top;

  let cropX = relX * scaleX;
  let cropY = relY * scaleY;
  let cropW = boxRect.width * scaleX;
  let cropH = boxRect.height * scaleY;

  cropX = Math.max(0, Math.min(natW - 1, cropX));
  cropY = Math.max(0, Math.min(natH - 1, cropY));
  cropW = Math.max(10, Math.min(cropW, natW - cropX));
  cropH = Math.max(10, Math.min(cropH, natH - cropY));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropW);
  canvas.height = Math.round(cropH);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const croppedDataUrl = canvas.toDataURL('image/png');
    closeUploadCropper();
    emitImageLoaded(croppedDataUrl, 'upload');
  } else {
    closeUploadCropper();
  }
};

const closeUploadCropper = () => {
  isUploadCropperOpen.value = false;
  rawUploadDataUrl.value = '';
  uploadImageZoom.value = 1;
  stopCropDrag();
  stopResizeDrag();
};

const triggerUpload = () => fileInputRef.value?.click();

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) readFile(file);
  target.value = '';
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
      rawUploadDataUrl.value = dataUrl;
      uploadCropPos.value = { x: 0, y: 0 };
      uploadCropSize.value = 180;
      uploadImageZoom.value = 1;
      isUploadCropperOpen.value = true;
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
        emitImageLoaded(dataUrl, 'camera');
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
    emitImageLoaded(dataUrl, 'camera');
  }
  closeLiveCamera();
};

onBeforeUnmount(() => {
  closeLiveCamera();
  closeUploadCropper();
});
</script>

<style scoped>
.camera-capture-root {
  width: 100%;
}

.camera-capture-card {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  transition: all var(--transition-normal);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.camera-capture-card.is-dragging {
  border-color: var(--accent-red);
  background: rgba(239, 68, 68, 0.12);
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.25);
}

/* 雙主要按鍵高對比醒目排版 */
.source-action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.source-hero-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: all var(--transition-fast);
  outline: none;
}

.btn-icon-bubble {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.btn-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.25;
}

.btn-title-main {
  font-size: 0.95rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.3px;
}

.btn-sub-label {
  font-size: 0.675rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
}

/* 選擇照片按鍵：高飽和印鑑鮮紅立體光暈 */
.btn-upload-hero {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.42);
}

.btn-upload-hero:hover {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.65);
  transform: translateY(-2px);
}

.btn-upload-hero:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

/* 拍照按鍵：科技相機深藍立體光暈 */
.btn-camera-hero {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.42);
}

.btn-camera-hero:hover {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.65);
  transform: translateY(-2px);
}

.btn-camera-hero:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.hidden-input {
  display: none;
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
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  background: rgba(0, 0, 0, 0.35);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.live-camera-modal .toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.live-camera-modal .toolbar-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.live-camera-modal .size-btn-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.live-camera-modal .step-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 600;
}

.live-camera-modal .step-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.live-camera-modal .step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.live-camera-modal .zoom-indicator {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 44px;
  text-align: center;
  padding: 3px 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  max-height: 52vh;
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
  /* 確保裁切框絕不貼邊滿版，四周保留充足取景餘裕 */
  max-width: 65%;
  max-height: 65%;
  aspect-ratio: 1 / 1;
  border: 2px dashed rgba(239, 68, 68, 0.85);
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.52);
  pointer-events: none;
  transition: width 0.2s ease, height 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 手機版自適應優化 */
@media (max-width: 640px) {
  .live-camera-modal .modal-card {
    width: 95%;
    max-width: 420px;
    padding: 14px;
    gap: 12px;
  }

  .live-camera-modal .crop-size-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 6px 10px;
  }

  .live-camera-modal .size-btn-group {
    width: 100%;
  }

  .live-camera-modal .size-btn {
    flex: 1;
    text-align: center;
    padding: 5px 6px;
    font-size: 0.72rem;
  }

  .live-camera-modal .video-container {
    /* 手機端改為 1:1 正方形取景，提供完整縱深空間 */
    aspect-ratio: 1 / 1;
    max-height: 46vh;
  }

  .live-camera-modal .crosshair-guide {
    max-width: 60%;
    max-height: 60%;
  }
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

/* 上傳相片取景裁切專用樣式 */
.upload-crop-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 52vh;
  background: #090d16;
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.upload-crop-stage:active {
  cursor: grabbing;
}

.upload-crop-img {
  max-width: 100%;
  max-height: 52vh;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  user-select: none;
  pointer-events: none;
}

.upload-draggable-box {
  max-width: none !important;
  max-height: none !important;
  pointer-events: auto !important;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.upload-draggable-box .corner {
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: #ef4444;
  border-style: solid;
  pointer-events: auto !important;
  z-index: 10;
}

.upload-draggable-box .corner::after {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
}

.upload-draggable-box .corner-tl {
  top: -3px;
  left: -3px;
  border-width: 3.5px 0 0 3.5px;
  border-top-left-radius: 6px;
  cursor: nwse-resize;
}

.upload-draggable-box .corner-tr {
  top: -3px;
  right: -3px;
  border-width: 3.5px 3.5px 0 0;
  border-top-right-radius: 6px;
  cursor: nesw-resize;
}

.upload-draggable-box .corner-bl {
  bottom: -3px;
  left: -3px;
  border-width: 0 0 3.5px 3.5px;
  border-bottom-left-radius: 6px;
  cursor: nesw-resize;
}

.upload-draggable-box .corner-br {
  bottom: -3px;
  right: -3px;
  border-width: 0 3.5px 3.5px 0;
  border-bottom-right-radius: 6px;
  cursor: nwse-resize;
}

/* 4 條邊框縮放把手 */
.upload-draggable-box .resize-edge {
  position: absolute;
  pointer-events: auto !important;
  z-index: 5;
}

.upload-draggable-box .edge-t {
  top: -6px;
  left: 20px;
  right: 20px;
  height: 12px;
  cursor: ns-resize;
}

.upload-draggable-box .edge-b {
  bottom: -6px;
  left: 20px;
  right: 20px;
  height: 12px;
  cursor: ns-resize;
}

.upload-draggable-box .edge-l {
  left: -6px;
  top: 20px;
  bottom: 20px;
  width: 12px;
  cursor: ew-resize;
}

.upload-draggable-box .edge-r {
  right: -6px;
  top: 20px;
  bottom: 20px;
  width: 12px;
  cursor: ew-resize;
}
</style>

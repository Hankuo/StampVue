<template>
  <div class="controls-card glass-panel">
    <div class="controls-header">
      <div class="title-wrap">
        <span class="step-badge">2</span>
        <h3>去背與陰影微調</h3>
      </div>
      <button class="reset-btn" title="重設為預設值" @click="resetDefaults">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        重設
      </button>
    </div>

    <!-- 影像來源處理管線模式提示 -->
    <div class="source-pipeline-banner" :class="modelValue.sourceType === 'camera' ? 'banner-camera' : 'banner-upload'">
      <div class="banner-badge">
        <span class="badge-dot"></span>
        <span>{{ modelValue.sourceType === 'camera' ? '📷 即時視訊拍攝模式' : '📁 照片檔案上傳模式' }}</span>
      </div>
      <p class="banner-note">
        {{ modelValue.sourceType === 'camera' ? '保留完整相機視野，不執行第一步偵測裁切原圖' : '執行第一步印章偵測定位，並自動裁切原圖' }}
      </p>
    </div>


    <!-- 圖片旋轉調校 -->
    <div class="rotation-section">
      <div class="slider-header">
        <label class="group-label">🔄 圖片旋轉角度</label>
        <span class="slider-val">{{ modelValue.rotation || 0 }}°</span>
      </div>
      <div class="rotation-actions-row">
        <button class="preset-btn rot-btn" @click="rotateBy(-90)">
          ↺ 向左 90°
        </button>
        <button class="preset-btn rot-btn" @click="rotateBy(90)">
          ↻ 向右 90°
        </button>
        <button class="preset-btn rot-btn" @click="updateOption('rotation', 0)">
          ⟲ 重置 0°
        </button>
      </div>
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        :value="modelValue.rotation || 0"
        @input="onRangeChange('rotation', $event)"
      />
    </div>


    <!-- 參數滑桿區 -->
    <div class="sliders-list">
      <!-- 陰影抑制力 -->
      <div class="slider-container">
        <div class="slider-header">
          <span class="label-with-tip" title="過濾手機懸空或燈光造成的局部暗灰陰影">
            🛡️ 陰影抑制力 (Shadow Suppression)
          </span>
          <span class="slider-val">{{ modelValue.shadowSuppression }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="modelValue.shadowSuppression"
          @input="onRangeChange('shadowSuppression', $event)"
        />
      </div>

      <!-- 去背門檻 -->
      <div class="slider-container">
        <div class="slider-header">
          <span class="label-with-tip" title="色度差判斷門檻，過高會掏空筆劃，過低會殘留底色">
            ⚖️ 去背靈敏度 (Threshold)
          </span>
          <span class="slider-val">{{ modelValue.threshold }}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="80"
          :value="modelValue.threshold"
          @input="onRangeChange('threshold', $event)"
        />
      </div>
    </div>

    <!-- 自動裁切開關 -->
    <div class="autocrop-row">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="modelValue.autoCrop"
          @change="onCheckboxChange('autoCrop', $event)"
        />
        <span class="checkbox-custom"></span>
        <span>智慧自動裁切邊界 (Auto-Crop)</span>
      </label>
      <div v-if="modelValue.autoCrop" class="padding-input-wrap">
        <span>邊距:</span>
        <input
          type="number"
          min="0"
          max="60"
          class="padding-num"
          :value="modelValue.padding"
          @input="onNumberChange('padding', $event)"
        />
        <span>px</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StampOptions } from '../types/stamp';

const props = defineProps<{
  modelValue: StampOptions;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: StampOptions): void;
  (e: 'change', value: StampOptions): void;
}>();

const updateOption = <K extends keyof StampOptions>(key: K, value: StampOptions[K]) => {
  const next: StampOptions = { ...props.modelValue, [key]: value };
  emit('update:modelValue', next);
  emit('change', next);
};

const onRangeChange = (key: keyof StampOptions, event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  updateOption(key, val as never);
};

const onNumberChange = (key: keyof StampOptions, event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = Math.max(0, Math.min(100, Number(target.value)));
  updateOption(key, val as never);
};

const onCheckboxChange = (key: keyof StampOptions, event: Event) => {
  const target = event.target as HTMLInputElement;
  updateOption(key, target.checked as never);
};

const rotateBy = (delta: number) => {
  const current = props.modelValue.rotation || 0;
  const next = (current + delta + 360) % 360;
  updateOption('rotation', next);
};

const resetDefaults = () => {
  const defaultOpts: StampOptions = {
    colorMode: 'auto',
    threshold: 40,
    shadowSuppression: 40,
    smoothness: 0,
    colorBoost: 25,
    autoCrop: true,
    padding: 16,
    rotation: 0
  };
  emit('update:modelValue', defaultOpts);
  emit('change', defaultOpts);
};
</script>

<style scoped>
.controls-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.controls-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.reset-btn {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.775rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reset-btn:hover {
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
}

.group-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}


.presets-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rotation-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  padding: 12px;
  border-radius: var(--radius-md);
}

.rotation-actions-row {
  display: flex;
  gap: 8px;
}

.rot-btn {
  flex: 1;
  font-size: 0.75rem;
  padding: 6px 8px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.rot-btn:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
}

.sliders-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label-with-tip {
  cursor: help;
}

.autocrop-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.checkbox-label input {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--border-subtle);
  background: var(--bg-input);
  display: inline-block;
  position: relative;
  transition: all var(--transition-fast);
}

.checkbox-label input:checked + .checkbox-custom {
  background: var(--accent-red);
  border-color: var(--accent-red);
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: 900;
}

.padding-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.padding-num {
  width: 48px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  outline: none;
}

/* 來源處理管線提示條 */
.source-pipeline-banner {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
  transition: all var(--transition-fast);
}

.banner-camera {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
}

.banner-upload {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.08);
}

.banner-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.banner-camera .badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 6px #3b82f6;
}

.banner-upload .badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.banner-note {
  font-size: 0.775rem;
  color: var(--text-muted);
  line-height: 1.3;
}
</style>

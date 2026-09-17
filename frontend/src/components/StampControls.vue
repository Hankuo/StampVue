<template>
  <div class="controls-card glass-panel">
    <!-- 頂部標題與快速重設列 -->
    <div class="controls-header">
      <div class="title-wrap">
        <span class="step-icon">🎛️</span>
        <h3>去背參數</h3>
      </div>
      <button class="reset-btn" title="重設為預設值" @click="resetDefaults">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        重設
      </button>
    </div>

    <!-- 核心精簡滑桿區 (高密度緊湊排版) -->
    <div class="sliders-list">
      <!-- 陰影抑制力 -->
      <div class="slider-row">
        <div class="slider-meta">
          <span class="label-text" title="強化對暗黑灰影的 Gamma 濾除能力">🛡️ 陰影抑制</span>
          <span class="slider-val">{{ modelValue.shadowSuppression }}%</span>
        </div>
        <div class="slider-input-wrapper">
          <input
            type="range"
            min="0"
            max="100"
            :value="modelValue.shadowSuppression"
            @input="onRangeChange('shadowSuppression', $event)"
          />
        </div>
      </div>

      <!-- 去背靈敏度 -->
      <div class="slider-row">
        <div class="slider-meta">
          <span class="label-text" title="色度差判斷門檻，越低保留越多細節，過高可能掏空筆劃">⚖️ 去背靈敏度</span>
          <span class="slider-val">{{ modelValue.threshold }}%</span>
        </div>
        <div class="slider-input-wrapper">
          <input
            type="range"
            min="10"
            max="80"
            :value="modelValue.threshold"
            @input="onRangeChange('threshold', $event)"
          />
        </div>
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

const resetDefaults = () => {
  const defaultOpts: StampOptions = {
    colorMode: 'auto',
    threshold: 40,
    shadowSuppression: 40,
    smoothness: 0,
    colorBoost: 25,
    autoCrop: true,
    padding: 16,
    rotation: 0,
    sourceType: props.modelValue.sourceType
  };
  emit('update:modelValue', defaultOpts);
  emit('change', defaultOpts);
};
</script>

<style scoped>
.controls-card {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-icon {
  font-size: 1rem;
}

.controls-header h3 {
  font-size: 0.925rem;
  font-weight: 700;
  color: var(--text-primary);
}

.reset-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.725rem;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reset-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* 高密度精簡滑桿區 */
.sliders-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slider-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-text {
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.slider-val {
  font-size: 0.725rem;
  font-weight: 700;
  color: #f87171;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.slider-input-wrapper {
  display: flex;
  align-items: center;
}
</style>

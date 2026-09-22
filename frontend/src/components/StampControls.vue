<template>
  <div class="controls-card glass-panel">
    <!-- 頂部快速重設列 (無「去背參數」字串與 icon) -->
    <div class="controls-header">
      <div class="header-spacer"></div>
      <button class="reset-btn" title="重設為預設值" @click="resetDefaults">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        重設
      </button>
    </div>

    <!-- 核心精簡滑桿區 (高密度緊湊排版，無 icon) -->
    <div class="sliders-list">
      <!-- 陰影抑制力 -->
      <div class="slider-row">
        <div class="slider-meta">
          <span class="label-text" title="強化對紙面暗部與冷色陰影的濾除能力 (建議 30~50%，設為 0% 關閉抑制)">陰影抑制</span>
          <span class="slider-val">{{ currentVal.shadowSuppression }}%</span>
        </div>
        <div class="slider-input-wrapper">
          <input
            type="range"
            min="0"
            max="100"
            :value="currentVal.shadowSuppression"
            @input="onRangeChange('shadowSuppression', $event)"
          />
        </div>
      </div>

      <!-- 去背強度 -->
      <div class="slider-row">
        <div class="slider-meta">
          <span class="label-text" title="去背判斷強度：數值越高去背越強，可消除頑固背景；數值越低保留越多淡印細節">去背強度</span>
          <span class="slider-val">{{ currentVal.threshold }}%</span>
        </div>
        <div class="slider-input-wrapper">
          <input
            type="range"
            min="0"
            max="80"
            :value="currentVal.threshold"
            @input="onRangeChange('threshold', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StampOptions } from '../types/stamp';

const props = withDefaults(
  defineProps<{
    value?: StampOptions;
    modelValue?: StampOptions;
  }>(),
  {
    value: undefined,
    modelValue: undefined
  }
);

const emit = defineEmits<{
  (e: 'input', value: StampOptions): void;
  (e: 'update:modelValue', value: StampOptions): void;
  (e: 'change', value: StampOptions): void;
}>();

const currentVal = computed<StampOptions>(() => {
  return props.value || props.modelValue || {
    colorMode: 'auto',
    threshold: 40,
    shadowSuppression: 40,
    smoothness: 0,
    colorBoost: 25,
    autoCrop: true,
    padding: 16,
    rotation: 0,
    sourceType: 'upload'
  };
});

const updateOption = <K extends keyof StampOptions>(key: K, value: StampOptions[K]) => {
  const next: StampOptions = { ...currentVal.value, [key]: value };
  emit('input', next);
  emit('update:modelValue', next);
  emit('change', next);
};

const onRangeChange = (key: keyof StampOptions, event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  updateOption(key, val as never);
};

const resetDefaults = () => {
  const isBlue = currentVal.value.colorMode === 'blue';
  const defaultOpts: StampOptions = {
    colorMode: currentVal.value.colorMode,
    threshold: isBlue ? 20 : 40,
    shadowSuppression: isBlue ? 35 : 40,
    smoothness: 0,
    colorBoost: 25,
    autoCrop: true,
    padding: 16,
    rotation: 0,
    sourceType: currentVal.value.sourceType
  };
  emit('input', defaultOpts);
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
  background: rgba(0, 101, 62, 0.08);
  border: 1px solid rgba(0, 101, 62, 0.28);
  color: #00653e;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 101, 62, 0.08);
}

.reset-btn:hover {
  color: #ffffff;
  background: #00653e;
  border-color: #00653e;
  box-shadow: 0 3px 10px rgba(0, 101, 62, 0.25);
  transform: translateY(-1px);
}

.reset-btn:active {
  transform: translateY(0);
}

/* 高密度精簡滑桿區 (間隔加大提供充裕視覺呼吸感) */
.sliders-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-text {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-primary);
}

.slider-val {
  font-size: 0.775rem;
  font-weight: 700;
  color: #00653e;
  background: rgba(0, 101, 62, 0.08);
  border: 1px solid rgba(0, 101, 62, 0.22);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.slider-input-wrapper {
  display: flex;
  align-items: center;
}
</style>

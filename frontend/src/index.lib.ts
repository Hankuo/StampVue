// 引入樣式以供打包工具提取 CSS
import './style.css';

// 導出核心無頭演算法 (Headless SDK)
export { StampProcessor } from './utils/stampProcessor';

// 導出型別宣告
export type {
  StampOptions,
  ProcessedStampResult,
  BoundingBox,
  StampColorMode,
  StampSourceType,
  PreviewBackground
} from './types/stamp';

// 導出開箱即用彈出式工作台 (Drop-in Modal Widget)
export { openStampModal, type StampModalOptions } from './modal';

// 導出 Vue 元件
export { default as StampWorkbench } from './components/StampWorkbench.vue';
export { default as StampModal } from './components/StampModal.vue';
export { default as CameraCapture } from './components/CameraCapture.vue';
export { default as StampControls } from './components/StampControls.vue';
export { default as ImagePreview } from './components/ImagePreview.vue';

// 導入供全域預設導出
import { StampProcessor } from './utils/stampProcessor';
import { openStampModal } from './modal';
import StampWorkbench from './components/StampWorkbench.vue';
import StampModal from './components/StampModal.vue';

const StampVue = {
  StampProcessor,
  openStampModal,
  openModal: openStampModal,
  StampWorkbench,
  StampModal
};

export default StampVue;

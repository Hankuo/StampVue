import Vue from 'vue';
import App from './App.vue';
import './style.css';

Vue.config.productionTip = false;

// 註冊 Service Worker 滿足 Chrome PWA 安裝標準
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[PWA] Service Worker 註冊失敗或開發模式:', err);
    });
  });
}

new Vue({
  render: (h) => h(App)
}).$mount('#app');


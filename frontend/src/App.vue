<template>
  <div class="app-shell">
    <main class="main-content">
      <StampWorkbench :show-sample-on-mount="true" />
    </main>
  </div>
</template>

<script setup lang="ts">
import StampWorkbench from './components/StampWorkbench.vue';
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  justify-content: center;
}

.main-content {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 12px 18px;
}

@media (max-width: 1024px) {
  .app-shell {
    justify-content: flex-start;
  }

  .main-content {
    padding: 8px 10px;
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: 6px 6px;
  }
}
</style>

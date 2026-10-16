<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-brand">
        <div class="brand-logo">印</div>
        <div class="brand-info">
          <h1 class="brand-title">StampVue</h1>
          <span class="brand-badge">純前端印章去背</span>
        </div>
      </div>
      <div class="header-actions">
        <InstallShortcutButton />
      </div>
    </header>

    <main class="main-content">
      <StampWorkbench :show-sample-on-mount="true" />
    </main>
  </div>
</template>

<script setup lang="ts">
import StampWorkbench from './components/StampWorkbench.vue';
import InstallShortcutButton from './components/InstallShortcutButton.vue';
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  justify-content: flex-start;
}

.app-header {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 14px 18px 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.brand-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.brand-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f8fafc;
}

.brand-badge {
  font-size: 0.72rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-content {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 8px 18px 16px;
}

@media (max-width: 1024px) {
  .app-header {
    padding: 10px 12px 0;
  }

  .main-content {
    padding: 6px 10px 12px;
  }
}

@media (max-width: 640px) {
  .app-header {
    padding: 8px 8px 0;
  }

  .brand-badge {
    display: none;
  }

  .main-content {
    padding: 4px 6px 10px;
  }
}
</style>

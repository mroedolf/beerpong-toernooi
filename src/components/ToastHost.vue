<script setup>
import { toasts } from '../store/toast.js'
</script>

<template>
  <div
    class="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toastItem in toasts"
        :key="toastItem.id"
        class="pointer-events-auto rounded-xl border-2 px-4 py-3 font-display text-base tracking-wide -rotate-1 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="
          toastItem.type === 'error'
            ? 'bg-cup text-foam border-cup-dark'
            : 'bg-beer text-night border-night'
        "
      >
        {{ toastItem.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95) rotate(-1deg);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease; }
  .toast-enter-from, .toast-leave-to { transform: none; }
}
</style>

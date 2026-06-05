<script setup>
const props = defineProps({
  value: { type: Number, default: null },
  held: { type: Boolean, default: false },
  holdable: { type: Boolean, default: false },
  spin: { type: Number, default: 0 }, // bump to retrigger the tumble animation
})
const emit = defineEmits(['toggle-hold'])

// Pip positions on a 3×3 grid (indices 0..8) per face value.
const PIPS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}
</script>

<template>
  <button
    type="button"
    class="mex-die relative size-24 rounded-2xl border-2 transition-transform focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
    :class="held
      ? 'bg-beer/90 border-beer shadow-[4px_4px_0_rgba(0,0,0,.55)] scale-95'
      : 'bg-foam border-line shadow-[4px_4px_0_rgba(0,0,0,.55)]'"
    :disabled="!holdable"
    :aria-label="held ? 'Dobbelsteen vrijgeven' : 'Dobbelsteen vasthouden'"
    :aria-pressed="held"
    @click="emit('toggle-hold')"
  >
    <span
      v-if="value"
      :key="`${spin}-${value}`"
      class="pips grid grid-cols-3 grid-rows-3 place-items-center absolute inset-2"
    >
      <span
        v-for="i in 9"
        :key="i"
        class="size-3.5 rounded-full"
        :class="PIPS[value].includes(i - 1) ? 'bg-night' : 'bg-transparent'"
      />
    </span>
    <span v-else class="font-display text-4xl text-night/40">?</span>
    <span
      v-if="held"
      class="absolute -top-2 -right-2 text-base bg-night rounded-full size-7 grid place-items-center border-2 border-beer"
    >🔒</span>
  </button>
</template>

<style scoped>
.pips {
  animation: tumble 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes tumble {
  0% { transform: rotate(-160deg) scale(0.3); opacity: 0; }
  60% { transform: rotate(12deg) scale(1.08); opacity: 1; }
  100% { transform: rotate(0deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .pips { animation: none; }
}
</style>

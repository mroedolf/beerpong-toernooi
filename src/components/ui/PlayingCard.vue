<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: Object, required: true }, // { rank, suit }
})

const isRed = computed(() => ['♥', '♦'].includes(props.card.suit))
</script>

<template>
  <div class="relative w-44 h-64 rounded-2xl bg-foam border-2 border-line shadow-[6px_6px_0_rgba(0,0,0,.55)]">
    <span class="absolute top-2 left-3 font-display text-2xl leading-none" :class="isRed ? 'text-cup' : 'text-night'">
      {{ card.rank }}<br /><span class="text-xl">{{ card.suit }}</span>
    </span>
    <span class="absolute bottom-2 right-3 rotate-180 font-display text-2xl leading-none" :class="isRed ? 'text-cup' : 'text-night'">
      {{ card.rank }}<br /><span class="text-xl">{{ card.suit }}</span>
    </span>
    <span class="absolute inset-0 grid place-items-center text-7xl" :class="isRed ? 'text-cup' : 'text-night'">
      {{ card.suit }}
    </span>
  </div>
</template>

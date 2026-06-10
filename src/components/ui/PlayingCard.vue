<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: Object, required: true }, // { rank, suit }
  size: { type: String, default: 'lg' },  // 'lg' | 'sm'
})

const isRed = computed(() => ['♥', '♦'].includes(props.card.suit))
const sm = computed(() => props.size === 'sm')
</script>

<template>
  <div
    class="relative bg-foam border-2 border-line"
    :class="sm
      ? 'w-11 h-16 rounded-lg shadow-[2px_2px_0_rgba(0,0,0,.5)]'
      : 'w-44 h-64 rounded-2xl shadow-[6px_6px_0_rgba(0,0,0,.55)]'"
  >
    <template v-if="sm">
      <span class="absolute top-1 left-1.5 font-display text-sm leading-none" :class="isRed ? 'text-cup' : 'text-night'">
        {{ card.rank }}
      </span>
      <span class="absolute inset-0 grid place-items-center text-2xl" :class="isRed ? 'text-cup' : 'text-night'">
        {{ card.suit }}
      </span>
    </template>
    <template v-else>
      <span class="absolute top-2 left-3 font-display text-2xl leading-none" :class="isRed ? 'text-cup' : 'text-night'">
        {{ card.rank }}<br /><span class="text-xl">{{ card.suit }}</span>
      </span>
      <span class="absolute bottom-2 right-3 rotate-180 font-display text-2xl leading-none" :class="isRed ? 'text-cup' : 'text-night'">
        {{ card.rank }}<br /><span class="text-xl">{{ card.suit }}</span>
      </span>
      <span class="absolute inset-0 grid place-items-center text-7xl" :class="isRed ? 'text-cup' : 'text-night'">
        {{ card.suit }}
      </span>
    </template>
  </div>
</template>

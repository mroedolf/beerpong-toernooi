<script setup>
import { computed } from 'vue'

const props = defineProps({
  player: { type: Object, required: true },
  size: { type: String, default: 'md' }, // 'sm' | 'md' | 'lg'
})

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
}
const boxClass = computed(() => sizeClasses[props.size] ?? sizeClasses.md)

const initials = computed(() => {
  const name = (props.player?.name ?? '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/)
  const chars = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)
  return chars.toUpperCase()
})
</script>

<template>
  <div
    class="shrink-0 rounded-full overflow-hidden border-2 border-line bg-night-soft grid place-items-center"
    :class="boxClass"
  >
    <img
      v-if="player?.photo"
      :src="player.photo"
      :alt="player.name"
      class="w-full h-full object-cover"
    />
    <span v-else class="font-display leading-none text-beer select-none" aria-hidden="true">
      {{ initials }}
    </span>
  </div>
</template>

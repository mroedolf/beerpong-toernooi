<script setup>
import { computed, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { useCod } from '../../store/cod.js'
import { toast } from '../../store/toast.js'

const c = useCod()

const drinker = computed(() => {
  const id = c.state.current?.drawerId
  return id ? c.playerById(id) : null
})

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}

function fireConfetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  confetti({
    colors: ['#e03c31', '#a92a22', '#f6a623'],
    particleCount: 120,
    spread: 80,
    startVelocity: 45,
    zIndex: 60,
    origin: { x: 0.5, y: 0.6 },
  })
}

onMounted(fireConfetti)
</script>

<template>
  <section class="pt-10 space-y-8 text-center">
    <header class="pour-in space-y-2">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">De vierde koning</p>
      <p class="text-6xl" aria-hidden="true">👑👑👑👑</p>
      <h2 class="font-display text-5xl text-cup leading-tight">
        {{ drinker ? drinker.name : 'Iemand' }} drinkt de koningsbeker!
      </h2>
      <p class="text-foam/60">Ad fundum. Geen genade. 💀</p>
    </header>

    <div class="space-y-2 max-w-xs mx-auto">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => c.restart())"
      >
        Opnieuw 🔄
      </button>
      <button
        class="w-full min-h-12 rounded-xl font-display bg-night-soft text-foam/70 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => c.stopGame())"
      >
        Naar de lobby
      </button>
    </div>
  </section>
</template>

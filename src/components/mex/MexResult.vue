<script setup>
import { computed } from 'vue'
import { useMex } from '../../store/mex.js'
import { toast } from '../../store/toast.js'
import { formatAdjes } from '../../lib/mex.js'

const m = useMex()

const result = computed(() => m.state.lastResult)
const loser = computed(() => m.playerById(result.value.loserId))
const tally = computed(() =>
  [...m.state.players].sort((x, y) => y.adjes - x.adjes || y.sips - x.sips),
)

function act(fn) {
  try {
    fn()
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Ronde gespeeld</p>
      <h2 class="font-display text-4xl text-cup leading-tight">{{ loser.name }} drinkt!</h2>
      <p class="font-display text-2xl text-beer mt-1">
        {{ result.sips }} slokken<template v-if="result.pot > 0"> + {{ formatAdjes(result.pot) }} adje uit de pot</template>
      </p>
      <p v-if="result.mexCount > 0" class="text-xs text-foam/60 mt-1">
        {{ result.mexCount }}× Mex gegooid deze ronde
      </p>
    </header>

    <ol class="space-y-2">
      <li
        v-for="(entry, i) in result.ranking"
        :key="entry.id"
        class="flex items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="entry.id === result.loserId
          ? 'border-cup bg-cup/15 rotate-[1.2deg]'
          : 'border-line bg-night-soft ' + (i % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.6deg]')"
      >
        <span class="font-display text-foam/50 w-5">{{ i + 1 }}</span>
        <span class="flex-1 font-semibold">{{ m.playerById(entry.id).name }}</span>
        <span class="font-display text-2xl" :class="entry.isMex ? 'text-cup' : 'text-beer'">
          {{ entry.label }}
        </span>
      </li>
    </ol>

    <div class="rounded-2xl border-2 border-line bg-night-soft p-4">
      <h3 class="font-display text-beer mb-2">Schandebord</h3>
      <ul class="space-y-1">
        <li v-for="p in tally" :key="p.id" class="flex justify-between text-sm">
          <span>{{ p.name }}</span>
          <span class="font-display text-beer">
            {{ p.sips }} slokken<template v-if="p.adjes > 0"> · {{ formatAdjes(p.adjes) }} adje</template>
          </span>
        </li>
      </ul>
    </div>

    <div class="space-y-2">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => m.nextRound())"
      >
        Volgende ronde →
      </button>
      <button
        class="w-full min-h-12 rounded-xl font-display bg-night-soft text-foam/70 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="act(() => m.stopGame())"
      >
        Stop het spel
      </button>
    </div>
  </section>
</template>

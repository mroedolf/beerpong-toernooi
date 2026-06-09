<script setup>
import { computed } from 'vue'
import { useTourney } from '../../store/tourney.js'
import TourneyShare from './TourneyShare.vue'

const t = useTourney()

const champion = computed(() => t.teamName(t.state.champion))
const ranking = computed(() => t.finalRanking())
const canEdit = computed(() => t.canEdit())
const medals = ['🥇', '🥈', '🥉']
</script>

<template>
  <section class="pt-6 space-y-6">
    <header class="text-center space-y-1 pour-in">
      <p class="text-sm font-semibold uppercase tracking-widest text-foam/50">Toernooi afgelopen</p>
      <h2 class="font-display text-4xl text-cup leading-tight">{{ champion }} wint!</h2>
    </header>

    <ol class="space-y-2">
      <li
        v-for="(id, i) in ranking"
        :key="id"
        class="flex items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)]"
        :class="i === 0
          ? 'border-cup bg-cup/15 rotate-[1.2deg]'
          : 'border-line bg-night-soft ' + (i % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.6deg]')"
      >
        <span class="w-7 text-center font-display text-xl">
          <template v-if="medals[i]">{{ medals[i] }}</template>
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="flex-1 min-w-0">
          <span class="font-semibold block truncate">{{ t.teamName(id) }}</span>
          <span v-if="t.teamMembers(id).length > 1" class="text-xs text-foam/50 block truncate">
            {{ t.teamMembers(id).join(' & ') }}
          </span>
        </span>
      </li>
    </ol>

    <TourneyShare />

    <div v-if="canEdit" class="space-y-2">
      <button
        class="w-full min-h-14 rounded-xl font-display text-2xl bg-cup text-foam border-b-4 border-cup-dark active:translate-y-0.5 active:border-b-2 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="t.backToSetup()"
      >
        Nieuw toernooi (zelfde spelers)
      </button>
      <button
        class="w-full min-h-12 rounded-xl font-display bg-night-soft text-foam/70 border-2 border-line active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
        @click="t.reset()"
      >
        Helemaal opnieuw
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from './lib/router.js'
import ToastHost from './components/ToastHost.vue'
import HomeScreen from './components/screens/HomeScreen.vue'
import BeerpongGame from './components/screens/BeerpongGame.vue'
import MexScreen from './components/screens/MexScreen.vue'
import CodScreen from './components/screens/CodScreen.vue'

const { path, navigate } = useRoute()

const routes = {
  '/': HomeScreen,
  '/beerpong': BeerpongGame,
  '/mex': MexScreen,
  '/circle': CodScreen,
}
const current = computed(() => routes[path.value] ?? HomeScreen)
const atHome = computed(() => current.value === HomeScreen)
</script>

<template>
  <div class="app-backdrop" aria-hidden="true" />

  <div class="min-h-dvh flex flex-col">
    <header
      class="sticky top-0 z-40 border-b-2 border-line bg-night/85 backdrop-blur-md"
    >
      <div class="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <button
          class="focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none rounded-lg"
          aria-label="Naar de spellen"
          @click="navigate('/')"
        >
          <h1 class="font-display text-2xl tracking-wide text-beer leading-none">
            <span class="text-cup">🍻</span> DRANKSPELEN
          </h1>
        </button>
        <button
          v-if="!atHome"
          class="min-h-9 px-3 rounded-full font-display text-sm bg-night-soft text-beer border-2 border-line transition-colors focus-visible:ring-2 focus-visible:ring-beer focus-visible:outline-none"
          @click="navigate('/')"
        >
          ‹ Spellen
        </button>
      </div>
    </header>

    <main class="max-w-md mx-auto w-full px-4 pb-24 flex-1">
      <component :is="current" />
    </main>
  </div>

  <ToastHost />
</template>

<script setup>
import { computed, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { useTournament } from '../../store/tournament.js'
import PlayerAvatar from '../ui/PlayerAvatar.vue'
import TournamentShare from '../ui/TournamentShare.vue'

const t = useTournament()
const canEdit = computed(() => t.canEdit())

// [championId, runnerUpId, thirdId, fourthId]
// Guard against being mounted without both finals resolved (e.g. a stale
// localStorage phase:'podium' alongside cleared matches): t.podium() would
// otherwise dereference finalMatch.winnerId and throw.
const ranking = computed(() => {
  const { finalMatch, losersMatch } = t.state
  // The losers final is optional — only require results for matches that exist.
  if (finalMatch?.winnerId == null || (losersMatch && losersMatch.winnerId == null)) return []
  return t.podium().map(id => t.teamById(id)).filter(Boolean)
})

const champion = computed(() => ranking.value[0] ?? null)
const fourth = computed(() => ranking.value[3] ?? null)

// Medal flair per finishing position; everyone past the heartbreak gets beer.
const MEDALS = ['🥇', '🥈', '🥉', '💔']
const medalFor = i => MEDALS[i] ?? '🍺'

function members(team) {
  if (!team) return []
  return team.playerIds.map(id => t.playerById(id)).filter(Boolean)
}

const championMembers = computed(() => members(champion.value))

// Team names already start with "De " (e.g. "De Natte Pelikanen").
// The 4th-place line wants "De {naam}" so we strip the existing prefix.
function bareName(team) {
  if (!team) return ''
  return team.name.replace(/^De\s+/i, '')
}

function fireConfetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#e03c31', '#f6a623', '#fdf3e0']
  const burst = (opts) => confetti({ colors, zIndex: 60, ...opts })

  // Three staggered bursts over ~1.5s.
  burst({ particleCount: 90, spread: 70, startVelocity: 45, origin: { x: 0.5, y: 0.7 } })
  setTimeout(() => {
    burst({ particleCount: 70, spread: 100, angle: 60, origin: { x: 0, y: 0.8 } })
  }, 700)
  setTimeout(() => {
    burst({ particleCount: 70, spread: 100, angle: 120, origin: { x: 1, y: 0.8 } })
  }, 1400)
}

function newTournament() {
  if (confirm('Alles wissen en opnieuw beginnen?')) {
    t.resetAll()
  }
}

onMounted(fireConfetti)
</script>

<template>
  <div class="max-w-md mx-auto px-4 pt-6 pb-10">
    <header class="text-center mb-6 reveal" style="--i: 0">
      <p class="font-display text-beer text-sm tracking-wide uppercase">De bekers zijn leeg</p>
      <h1 class="font-display text-4xl text-foam leading-none">Het eindklassement</h1>
    </header>

    <!-- CHAMPION block -->
    <section
      v-if="champion"
      class="champ relative overflow-hidden rounded-2xl border-2 border-cup bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)] p-5 mb-8 reveal"
      style="--i: 1"
    >
      <!-- periodic shine sweep -->
      <span class="shine" aria-hidden="true"></span>

      <p class="relative font-display text-cup text-sm uppercase tracking-wide">KAMPIOENEN</p>
      <h2 class="relative font-display text-foam text-4xl leading-none mt-1 mb-4 break-words">
        {{ champion.name }}
      </h2>

      <!-- AI photo, else a member-avatar collage fallback -->
      <div class="relative rounded-xl overflow-hidden border-2 border-line bg-night mb-4">
        <img
          v-if="champion.aiPhoto"
          :src="champion.aiPhoto"
          :alt="`Teamfoto van ${champion.name}`"
          class="w-full aspect-square object-cover"
        />
        <div v-else class="aspect-square grid place-items-center p-6">
          <div class="flex items-center justify-center -space-x-4">
            <PlayerAvatar
              v-for="m in championMembers"
              :key="m.id"
              :player="m"
              size="lg"
            />
          </div>
        </div>
      </div>

      <p class="relative font-display text-beer text-lg">
        {{ championMembers.map(m => m.name).join(' & ') }}
      </p>
    </section>

    <!-- PODIUM strip: 2 - 1 - 3, heights differ, blocks rise staggered -->
    <section v-if="ranking.length >= 3" class="mb-8">
      <div class="grid grid-cols-3 items-end gap-2">
        <!-- 2nd -->
        <div class="text-center">
          <p class="font-display text-foam text-sm mb-2 leading-tight break-words min-h-9 flex items-end justify-center">
            {{ ranking[1].name }}
          </p>
          <div class="block-rise rounded-t-lg border-2 border-b-0 border-line bg-night-soft h-20 grid place-items-center" style="--rise: 0">
            <div>
              <div class="text-2xl">🥈</div>
              <div class="font-display text-beer text-3xl leading-none">2</div>
            </div>
          </div>
        </div>
        <!-- 1st -->
        <div class="text-center">
          <p class="font-display text-foam text-sm mb-2 leading-tight break-words min-h-9 flex items-end justify-center">
            {{ ranking[0].name }}
          </p>
          <div class="block-rise rounded-t-lg border-2 border-b-0 border-cup bg-night-soft h-32 grid place-items-center" style="--rise: 1">
            <div>
              <div class="text-3xl">🥇</div>
              <div class="font-display text-cup text-4xl leading-none">1</div>
            </div>
          </div>
        </div>
        <!-- 3rd -->
        <div class="text-center">
          <p class="font-display text-foam text-sm mb-2 leading-tight break-words min-h-9 flex items-end justify-center">
            {{ ranking[2].name }}
          </p>
          <div class="block-rise rounded-t-lg border-2 border-b-0 border-line bg-night-soft h-14 grid place-items-center" style="--rise: 2">
            <div>
              <div class="text-2xl">🥉</div>
              <div class="font-display text-beer text-3xl leading-none">3</div>
            </div>
          </div>
        </div>
      </div>
      <div class="h-2 rounded-b bg-line/60"></div>
    </section>

    <!-- 4th place — with love -->
    <p v-if="fourth" class="text-center text-foam/50 text-sm mb-8 reveal" style="--i: 2">
      4e — met veel liefde, De {{ bareName(fourth) }}
    </p>

    <!-- Full ranking -->
    <section class="mb-10">
      <h3 class="font-display text-foam text-xl mb-3">Volledige rangschikking</h3>
      <ul class="space-y-2">
        <li
          v-for="(team, i) in ranking"
          :key="team.id"
          class="reveal flex items-center gap-3 rounded-xl border-2 border-line bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)] px-3 py-2.5"
          :class="i % 2 === 0 ? 'tilt-neg' : 'tilt-pos'"
          :style="`--i: ${3 + i}`"
        >
          <span class="font-display text-beer text-2xl w-8 text-center shrink-0">{{ i + 1 }}</span>
          <span class="text-xl shrink-0">{{ medalFor(i) }}</span>
          <span class="font-display text-foam text-lg leading-tight break-words">{{ team.name }}</span>
        </li>
      </ul>
    </section>

    <!-- Share the finished tournament -->
    <TournamentShare class="mb-4" />

    <!-- Footer: start over (creator only) -->
    <button
      v-if="canEdit"
      class="w-full min-h-12 rounded-xl font-display text-lg text-foam bg-night-soft border-2 border-line active:translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer"
      @click="newTournament"
    >
      Nieuw toernooi
    </button>
  </div>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
  animation: reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Sticker tilt on alternating list rows; rotation is baked into the reveal
   keyframes so the resting state keeps the tilt after the animation ends. */
.reveal.tilt-neg {
  animation-name: reveal-tilt-neg;
}
.reveal.tilt-pos {
  animation-name: reveal-tilt-pos;
}
@keyframes reveal-tilt-neg {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97) rotate(-1deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(-1deg);
  }
}
@keyframes reveal-tilt-pos {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97) rotate(1.2deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(1.2deg);
  }
}

/* Podium blocks rise from their base, staggered 2 -> 1 -> 3. */
.block-rise {
  transform-origin: bottom;
  animation: rise 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--rise, 0) * 220ms);
}
@keyframes rise {
  from {
    transform: scaleY(0.05);
    opacity: 0.2;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* Champion shine: a periodic diagonal highlight sweeping across the card. */
.champ .shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 40%,
    rgba(253, 243, 224, 0.18) 50%,
    transparent 60%
  );
  transform: translateX(-120%);
  animation: shine 5s ease-in-out 1.5s infinite;
}
@keyframes shine {
  0% {
    transform: translateX(-120%);
  }
  18% {
    transform: translateX(120%);
  }
  100% {
    transform: translateX(120%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .reveal.tilt-neg,
  .reveal.tilt-pos,
  .block-rise {
    animation: none;
    opacity: 1;
  }
  .reveal {
    transform: none;
  }
  .reveal.tilt-neg {
    transform: rotate(-1deg);
  }
  .reveal.tilt-pos {
    transform: rotate(1.2deg);
  }
  .block-rise {
    transform: none;
  }
  .champ .shine {
    animation: none;
    display: none;
  }
}
</style>

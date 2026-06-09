<script setup>
import { computed } from 'vue'
import { useTournament } from '../../store/tournament.js'

const t = useTournament()

const rows = computed(() =>
  t.currentStandings().map((row, i) => {
    const team = t.teamById(row.teamId)
    return {
      ...row,
      rank: i + 1,
      name: team?.name ?? '???',
      members: (team?.playerIds ?? []).map(id => t.playerById(id)?.name).filter(Boolean).join(' & '),
    }
  }),
)

function signed(n) {
  return n > 0 ? `+${n}` : `${n}`
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border-2 border-line bg-night-soft shadow-[4px_4px_0_rgba(0,0,0,.55)]">
    <table class="w-full border-collapse text-left">
      <thead>
        <tr class="font-display border-b-2 border-line text-xs uppercase tracking-wide text-foam/50">
          <th scope="col" class="py-2 pl-3 pr-1 font-normal">#</th>
          <th scope="col" class="py-2 pr-2 font-normal">Team</th>
          <th scope="col" class="py-2 px-1 text-center font-normal" title="Gespeeld">G</th>
          <th scope="col" class="py-2 px-1 text-center font-normal" title="Winsten">W</th>
          <th scope="col" class="py-2 px-1 text-center font-normal" title="Verlies">V</th>
          <th scope="col" class="py-2 pl-1 pr-3 text-right font-normal" title="Bekersaldo">Saldo</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.teamId"
          class="border-b border-line/60 last:border-b-0"
          :class="[
            row.rank <= 2 ? 'bg-beer/5' : 'text-foam/45',
          ]"
        >
          <td class="py-2.5 pl-3 pr-1">
            <span
              class="font-display inline-grid h-6 w-6 place-items-center rounded-md text-sm"
              :class="row.rank <= 2 ? 'bg-beer/20 text-beer' : 'text-foam/40'"
            >{{ row.rank }}</span>
          </td>
          <td class="py-2.5 pr-2">
            <span
              class="font-display block truncate text-base leading-tight"
              :class="row.rank <= 2 ? 'text-foam' : ''"
            >{{ row.name }}</span>
            <span v-if="row.members" class="block truncate text-xs text-foam/50 leading-tight">{{ row.members }}</span>
          </td>
          <td class="font-display py-2.5 px-1 text-center text-base tabular-nums">{{ row.played }}</td>
          <td class="font-display py-2.5 px-1 text-center text-base text-beer tabular-nums">{{ row.wins }}</td>
          <td class="font-display py-2.5 px-1 text-center text-base tabular-nums">{{ row.losses }}</td>
          <td class="font-display py-2.5 pl-1 pr-3 text-right text-base text-beer tabular-nums">{{ signed(row.saldo) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="px-3 py-2 text-xs text-foam/40">Rangschikking: winsten → bekersaldo → onderling</p>
  </div>
</template>

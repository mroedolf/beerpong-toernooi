import { reactive } from 'vue'

export const toasts = reactive([])

export function toast(message, type = 'error', ttl = 4000) {
  const id = crypto.randomUUID()
  toasts.push({ id, message, type })
  setTimeout(() => {
    const i = toasts.findIndex(t => t.id === id)
    if (i !== -1) toasts.splice(i, 1)
  }, ttl)
}

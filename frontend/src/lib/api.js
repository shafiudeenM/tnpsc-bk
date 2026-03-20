import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

async function authFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  ask: (body)              => authFetch('/api/ask',           { method: 'POST', body: JSON.stringify(body) }),
  generateMCQ: (body)      => authFetch('/api/mcq/generate',  { method: 'POST', body: JSON.stringify(body) }),
  submitMCQ: (body)        => authFetch('/api/mcq/submit',    { method: 'POST', body: JSON.stringify(body) }),
  mcqHistory: ()           => authFetch('/api/mcq/history'),
  progress: (examGroup)    => authFetch(`/api/progress?examGroup=${examGroup}`),
  health: ()               => fetch(`${BASE}/api/health`).then(r => r.json()),

  uploadPDF: async (formData) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
  },
}

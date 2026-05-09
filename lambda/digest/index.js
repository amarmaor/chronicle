// WARNING: This Lambda uses the Supabase service-role key, which bypasses Row Level Security (RLS).
// NEVER use the service-role key in client-side (browser) code — it grants full database access.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  // 1. Compute date window: 7 days ago → now
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  // 2. Query all non-digest entries from the past 7 days
  // (service role key bypasses RLS — sees all users' data)
  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('id, user_id, title, content, created_at')
    .eq('is_digest', false)
    .gte('created_at', weekAgo.toISOString())
    .lt('created_at', now.toISOString())

  if (error) throw new Error(`Failed to fetch entries: ${error.message}`)
  if (!entries || entries.length === 0) {
    console.log('No entries to digest')
    return { statusCode: 200, body: 'No entries found' }
  }

  // 3. Group by user_id
  const byUser = {}
  for (const entry of entries) {
    if (!byUser[entry.user_id]) byUser[entry.user_id] = []
    byUser[entry.user_id].push(entry)
  }

  // 4. Format dates for title
  const startDate = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const digestTitle = `Weekly Digest — ${startDate}–${endDate}`

  // 5. Build and insert a digest row per user
  const digests = Object.entries(byUser).map(([userId, userEntries]) => {
    const content = userEntries
      .map(e => `• ${e.title}: ${e.content.slice(0, 100)}${e.content.length > 100 ? '…' : ''}`)
      .join('\n')
    return { user_id: userId, title: digestTitle, content, is_digest: true }
  })

  const { error: insertError } = await supabase.from('journal_entries').insert(digests)
  if (insertError) throw new Error(`Failed to insert digests: ${insertError.message}`)

  console.log(`Created ${digests.length} digest(s)`)
  return { statusCode: 200, body: `Created ${digests.length} digest(s)` }
}

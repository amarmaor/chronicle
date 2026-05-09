'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function deleteEntry(entryId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify entry belongs to the current user
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single()

  if (entryError || !entry) redirect('/journal')

  // Fetch attachment S3 keys before deleting the entry
  const { data: attachments } = await supabase
    .from('attachments')
    .select('s3_key')
    .eq('entry_id', entryId)

  // Delete each file from S3
  if (attachments && attachments.length > 0) {
    await Promise.all(
      attachments.map((a) =>
        s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: a.s3_key,
        }))
      )
    )
  }

  // Delete the entry — CASCADE removes attachment rows automatically
  await supabase.from('journal_entries').delete().eq('id', entryId)

  redirect('/journal')
}

import BrainStudioClient from './BrainStudioClient'
import { getBrainNotes } from '@/lib/brainStudioDb'

export const dynamic = 'force-dynamic'

export default async function BrainStudioPage() {
  const notes = await getBrainNotes()
  return <BrainStudioClient initialNotes={notes} />
}

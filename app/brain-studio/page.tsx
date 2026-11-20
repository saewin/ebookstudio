import BrainStudioClient from './BrainStudioClient'
import { getBrainStudioState } from '@/lib/brainStudioDb'

export const dynamic = 'force-dynamic'

export default async function BrainStudioPage() {
  const state = await getBrainStudioState()
  return <BrainStudioClient initialState={state} />
}

import CeoBrainClient from './CeoBrainClient'
import { getBrainStudioState } from '@/lib/brainStudioDb'
import { getCeoBrainState } from '@/lib/ceoBrainDb'
import { getBangkokDateString } from '@/lib/ceoBrainTypes'

export const dynamic = 'force-dynamic'

export default async function CeoBrainPage() {
  const [ceoBrain, brainStudio] = await Promise.all([
    getCeoBrainState(),
    getBrainStudioState(),
  ])
  const initialDate = getBangkokDateString()

  return (
    <CeoBrainClient
      initialCeoBrain={ceoBrain}
      initialBrainStudio={brainStudio}
      initialDate={initialDate}
    />
  )
}

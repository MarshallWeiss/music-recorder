import { get, set } from 'idb-keyval'
import { Tuning } from '../audio/tunings'

const CUSTOM_TUNINGS_KEY = 'custom-tunings'
const SELECTED_TUNING_KEY = 'selected-tuning-name'

export async function loadCustomTunings(): Promise<Tuning[]> {
  const tunings = await get<Tuning[]>(CUSTOM_TUNINGS_KEY)
  return tunings ?? []
}

export async function saveCustomTunings(tunings: Tuning[]): Promise<void> {
  await set(CUSTOM_TUNINGS_KEY, tunings)
}

export async function loadSelectedTuningName(): Promise<string> {
  const name = await get<string>(SELECTED_TUNING_KEY)
  return name ?? 'Standard'
}

export async function saveSelectedTuningName(name: string): Promise<void> {
  await set(SELECTED_TUNING_KEY, name)
}

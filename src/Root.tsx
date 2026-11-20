import { useCallback, useState } from 'react'
import App from './App'
import BraunTG60 from './components/braun/BraunTG60'
import MachinePicker from './components/MachinePicker'
import MuseumLabel from './components/MuseumLabel'
import { loadMachine, MachineId, saveMachine } from './machines'
import './styles/braun.css'

/** Chooses which recorder is on the bench. Each machine mounts on its own, with its own engine and tapes. */
export default function Root() {
  const [machine, setMachineState] = useState<MachineId>(loadMachine)
  const setMachine = useCallback((next: MachineId) => {
    saveMachine(next)
    setMachineState(next)
  }, [])

  const [aboutOpen, setAboutOpen] = useState(false)

  const picker = (
    <>
      <MachinePicker machine={machine} onChange={setMachine} />
      <button type="button" className="about-button" onClick={() => setAboutOpen(true)}>
        About
      </button>
    </>
  )

  return (
    <>
      {machine === 'braun-tg60'
        ? <BraunTG60 key="braun" machinePicker={picker} />
        : <App key="porta" machinePicker={picker} />}
      <MuseumLabel machine={machine} open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}

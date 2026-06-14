import NexusPathEngine from './NexusPathEngine.jsx'

// App is the root component of the UI tree.
// For V0 it does exactly one thing: mount the single screen that *is* the
// product — the Path Engine. There is no routing or global layout yet because
// nothing needs it. When a second screen exists, it gets composed here.
export default function App() {
  return <NexusPathEngine />
}

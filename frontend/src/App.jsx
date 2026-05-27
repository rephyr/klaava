import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
  }, [])

  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">{message || 'Loading...'}</h1>
    </div>
  )
}

export default App

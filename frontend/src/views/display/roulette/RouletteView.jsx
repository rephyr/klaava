import { useEffect, useRef, useState } from 'react'
import { getRouletteState } from '../../../services/rouletteService'
import { formatKlaava } from '../../../utils/formatters'

// European wheel order
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const SEGMENT = (2 * Math.PI) / WHEEL_ORDER.length

function segmentColor(n) {
  if (n === 0) return '#15803d'
  return RED_NUMBERS.has(n) ? '#b91c1c' : '#111827'
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4)
}

function drawWheel(canvas, rotation) {
  const ctx = canvas.getContext('2d')
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const outerR = cx - 10
  const labelR = outerR * 0.8
  const innerR = outerR * 0.13
  const fontSize = Math.round(outerR * 0.074)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Outer wood rim
  ctx.beginPath()
  ctx.arc(cx, cy, outerR + 8, 0, 2 * Math.PI)
  ctx.fillStyle = '#78350f'
  ctx.fill()

  // Segments
  WHEEL_ORDER.forEach((num, i) => {
    const center = rotation + i * SEGMENT
    const start = center - SEGMENT / 2
    const end = center + SEGMENT / 2

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, outerR, start, end)
    ctx.closePath()
    ctx.fillStyle = segmentColor(num)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Number label, rotated to read outward
    const lx = cx + Math.cos(center) * labelR
    const ly = cy + Math.sin(center) * labelR
    ctx.save()
    ctx.translate(lx, ly)
    ctx.rotate(center + Math.PI / 2)
    ctx.fillStyle = 'white'
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(num), 0, 0)
    ctx.restore()
  })

  // Inner separator ring
  ctx.beginPath()
  ctx.arc(cx, cy, outerR * 0.55, 0, 2 * Math.PI)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Center hub
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI)
  ctx.fillStyle = '#1f2937'
  ctx.fill()
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 2
  ctx.stroke()

  // Fixed pointer at top (drawn after wheel so it's always on top)
  const tipY = cy - outerR + 2
  const pW = 9
  const pH = 18
  ctx.beginPath()
  ctx.moveTo(cx, tipY)
  ctx.lineTo(cx - pW, tipY - pH)
  ctx.lineTo(cx + pW, tipY - pH)
  ctx.closePath()
  ctx.fillStyle = '#fbbf24'
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 1
  ctx.fill()
  ctx.stroke()
}

function RouletteView() {
  const canvasRef = useRef(null)
  const rotRef = useRef(Math.random() * 2 * Math.PI) // start at random angle
  const spinningRef = useRef(false)
  const rafRef = useRef(null)

  const [state, setState] = useState(null)
  const [showResults, setShowResults] = useState(false)

  function spinTo(winningNumber, onDone) {
    const winIdx = WHEEL_ORDER.indexOf(winningNumber)
    // Segment i is at top when: rotation + i*SEGMENT = -π/2 (top of canvas)
    const targetBase = -Math.PI / 2 - winIdx * SEGMENT
    const normalized = ((targetBase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    const startRot = rotRef.current
    const startNorm = ((startRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    let delta = normalized - startNorm
    if (delta <= 0) delta += 2 * Math.PI
    const totalDelta = 7 * 2 * Math.PI + delta // 7 full spins + alignment

    const DURATION = 5500
    const startTime = performance.now()
    spinningRef.current = true

    function frame(now) {
      const t = Math.min((now - startTime) / DURATION, 1)
      rotRef.current = startRot + totalDelta * easeOut(t)
      if (canvasRef.current) drawWheel(canvasRef.current, rotRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        spinningRef.current = false
        onDone()
      }
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  useEffect(() => {
    let prevStatus = null

    function poll() {
      if (spinningRef.current) return
      getRouletteState().then((s) => {
        if (s.status !== 'finished') setShowResults(false)

        if (prevStatus === 'betting' && s.status === 'finished') {
          setState(s)
          setShowResults(false)
          spinTo(s.result, () => setShowResults(true))
        } else if (s.status === 'finished' && prevStatus === 'finished') {
          setState(s)
          setShowResults(true)
        } else {
          setState(s)
        }
        prevStatus = s.status
      })
    }

    if (canvasRef.current) drawWheel(canvasRef.current, rotRef.current)

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      clearInterval(interval)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!state || state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <p className="text-3xl font-semibold text-gray-400">Roulette</p>
        <p className="text-gray-600 text-sm">Waiting for admin to start betting</p>
      </div>
    )
  }

  const resultBg = state.resultColor === 'red' ? 'bg-red-900' : state.resultColor === 'green' ? 'bg-green-900' : 'bg-gray-800'

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
      <p className="text-gray-400 text-sm uppercase tracking-widest">Roulette</p>

      <canvas ref={canvasRef} width={420} height={420} className="rounded-full" />

      {state.status === 'betting' && !spinningRef.current && (
        <p className="text-xl text-yellow-400 font-semibold animate-pulse">Place your bets</p>
      )}

      {showResults && state.result !== null && (
        <>
          <div className={`rounded-2xl px-12 py-4 text-center ${resultBg}`}>
            <p className="text-7xl font-black">{state.result}</p>
            <p className="text-lg capitalize text-gray-300">
              {state.resultColor}
              {state.result !== 0 && (
                <span className="text-gray-500 ml-3">{state.result % 2 === 0 ? 'even' : 'odd'}</span>
              )}
            </p>
          </div>

          {state.bets.length > 0 && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {state.bets.map((bet) => (
                <div
                  key={bet.playerId}
                  className={`rounded-2xl p-4 flex flex-col gap-1 ${bet.result === 'win' ? 'bg-green-900' : 'bg-red-900'}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-lg font-bold">{bet.playerName}</p>
                    <p className="text-sm text-gray-300 capitalize font-medium">
                      {bet.betType === 'number' ? `#${bet.betValue}` : bet.betValue}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400">{formatKlaava(bet.amount)} bet</p>
                  <p className={`text-2xl font-black ${bet.result === 'win' ? 'text-green-300' : 'text-red-300'}`}>
                    {bet.result === 'win'
                      ? `WIN +${formatKlaava(bet.payout)}`
                      : `LOSE -${formatKlaava(bet.amount)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RouletteView

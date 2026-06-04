import { useEffect, useRef, useState } from 'react'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']

function WheelView({ gameState }) {
  const segments = gameState.wheelSegments ?? []
  const angle = gameState.wheelAngle ?? 0
  const canvasRef = useRef(null)
  const [displayAngle, setDisplayAngle] = useState(angle)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setDisplayAngle(angle)
  }, [angle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || segments.length === 0) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 4
    const segAngle = (2 * Math.PI) / segments.length

    ctx.clearRect(0, 0, size, size)
    segments.forEach((label, i) => {
      const start = i * segAngle
      const end = start + segAngle
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(label, radius - 12, 6)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI)
    ctx.fillStyle = '#1f2937'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [segments])

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8">
      <p className="text-gray-400 text-sm uppercase tracking-widest">Spin the Wheel</p>
      <div className="relative">
        <div
          style={{
            transform: `rotate(${displayAngle}deg)`,
            transition: mountedRef.current ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          <canvas ref={canvasRef} width={400} height={400} className="rounded-full" />
        </div>
        <div style={{
          position: 'absolute',
          top: '-14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: '28px solid white',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }} />
      </div>
    </div>
  )
}

export default WheelView

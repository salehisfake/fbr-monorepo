'use client'

export default function FilmGrainOverlay() {
  return (
    <>
      <style>
        {`
          @keyframes film-grain-shift {
            0% { transform: translate3d(0, 0, 0); }
            20% { transform: translate3d(-1.5%, 1.2%, 0); }
            40% { transform: translate3d(1.2%, -1.8%, 0); }
            60% { transform: translate3d(-1.0%, -0.8%, 0); }
            80% { transform: translate3d(1.5%, 1.0%, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: '-40%',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.08,
          mixBlendMode: 'multiply',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27160%27 viewBox=%270 0 160 160%27%3E%3Cfilter id=%27g%27 x=%270%27 y=%270%27 width=%27100%25%27 height=%27100%25%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27160%27 height=%27160%27 filter=%27url(%23g)%27 opacity=%270.9%27/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
          animation: 'film-grain-shift 420ms steps(2, end) infinite',
          willChange: 'transform',
        }}
      />
    </>
  )
}


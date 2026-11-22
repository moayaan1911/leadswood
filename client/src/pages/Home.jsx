import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle.js'

function Home() {
  usePageTitle('LeadsWood — every lead, from first call to closed deal')

  return (
    <div className="grid min-h-screen bg-canvas text-ink md:grid-cols-2">
      {/* Left: photo, with the header text sitting on it */}
      <div className="relative min-h-[60vh] md:min-h-screen">
        <img
          src="/leads-banner.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1d15] via-[#2a1d15]/50 to-[#2a1d15]/10" />
        <h1 className="absolute bottom-0 left-0 p-8 font-display text-3xl leading-[1.1] font-black tracking-tight text-canvas uppercase sm:p-12 sm:text-4xl lg:text-5xl">
          Every lead,
          <br />
          from first call
          <br />
          to closed deal.
        </h1>
      </div>

      {/* Right: subtitle above the enter button, nothing else */}
      <div className="flex flex-col items-center justify-center gap-12 px-8 py-16 text-center sm:px-14 md:px-16 lg:px-24">
        <p className="max-w-md font-mono text-base leading-relaxed tracking-wide text-muted uppercase sm:text-lg">
          Capture leads, keep their status honest, and find anyone again in a
          keystroke
          <span
            aria-hidden="true"
            className="animate-blink motion-reduce:animate-none"
          >
            _
          </span>
        </p>
        <Link
          to="/login"
          className="border-2 border-brand bg-brand px-10 py-4 font-display text-sm font-bold tracking-[0.2em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none sm:px-16 sm:py-6 sm:text-base sm:tracking-[0.3em]"
        >
          Enter the App
        </Link>
      </div>
    </div>
  )
}

export default Home

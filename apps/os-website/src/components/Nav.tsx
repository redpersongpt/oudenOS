import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Download', href: '/download' },
] as const

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 16)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20 group-hover:border-brand-500/40 transition-colors">
            <div className="h-3 w-3 rounded-sm bg-brand-500" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-100">
            redcore-OS
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                location.pathname === link.href
                  ? 'text-neutral-100 bg-white/[0.06]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/download"
            className="ml-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
          >
            Download for Windows
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 pb-5 pt-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
                    location.pathname === link.href
                      ? 'text-neutral-100 bg-white/[0.06]'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/download"
                className="mt-2 rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white"
              >
                Download for Windows
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

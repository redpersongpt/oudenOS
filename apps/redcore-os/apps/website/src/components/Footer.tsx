import { Link } from 'react-router-dom'

const footerLinks = {
  product: [
    { label: 'Download', href: '/download' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Changelog', href: '/download' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'License', href: '#' },
  ],
} as const

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 border border-brand-500/20">
                <div className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-neutral-200">
                redcore-OS
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              In-place Windows transformation. Cleaner, faster, more intentional
              — without reinstalling.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Legal
            </h4>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-neutral-600">
            {new Date().getFullYear()} redcore-OS. All rights reserved.
          </p>
          <p className="text-xs text-neutral-600">
            Windows is a registered trademark of Microsoft Corporation.
          </p>
        </div>
      </div>
    </footer>
  )
}

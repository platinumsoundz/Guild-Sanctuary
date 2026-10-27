'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Keep diagnostics in the developer console; never expose raw exception text to visitors.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Sanctuary route error:', error)
    } else {
      console.error('Sanctuary route error', error.digest ? { digest: error.digest } : {})
    }
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <section
        role="alert"
        aria-labelledby="sanctuary-error-title"
        className="w-full max-w-lg space-y-6 rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">The Sanctuary</p>
          <h1 id="sanctuary-error-title" className="text-xl font-bold">This space needs a moment.</h1>
          <p className="text-sm leading-6 text-neutral-300">
            Something went wrong while opening this part of the Sanctuary. Your private information is not shown here.
            You can try again or return to the start.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-500">
              Reference: <code>{error.digest}</code>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 rounded-lg bg-emerald-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            Try again
          </button>
          <a
            href="/"
            className="flex-1 rounded-lg border border-neutral-700 px-4 py-3 text-center text-sm font-semibold text-neutral-100 transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            Return to home
          </a>
        </div>
      </section>
    </main>
  )
}

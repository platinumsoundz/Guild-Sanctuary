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
    // Log the runtime error to the browser console for inspection
    console.error('Runtime error caught by boundary:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-6 shadow-2xl">
        <div>
          <h2 className="text-xl font-bold text-red-400">Runtime Exception Caught</h2>
          <p className="text-sm text-neutral-400 mt-1">
            The application crashed during client-side rendering or hydration.
          </p>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-red-300 overflow-x-auto">
          {error.message || 'Unknown runtime error'}
          {error.digest && <div className="text-neutral-500 mt-2">Digest: {error.digest}</div>}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="flex-1 bg-neutral-100 text-neutral-950 font-semibold py-2.5 rounded-lg hover:bg-neutral-200 transition"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 bg-neutral-800 text-neutral-200 font-semibold py-2.5 rounded-lg hover:bg-neutral-700 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    </main>
  )
}
export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center bg-neutral-950 px-6 py-16 text-neutral-100"
    >
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-300 motion-reduce:animate-none" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Opening your Sanctuary</h1>
        <p className="text-sm text-neutral-400">Preparing your space. This should only take a moment.</p>
      </div>
    </main>
  )
}

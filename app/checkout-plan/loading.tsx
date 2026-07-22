// Server-rendered instantly on first load (before the client bundle hydrates),
// so a cold first-open shows a spinner instead of a blank white page.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#262E84] border-t-transparent" />
    </div>
  );
}

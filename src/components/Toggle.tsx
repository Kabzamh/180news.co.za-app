/** An on/off switch with its label on the left. */
export function Toggle({ label, checked, onChange, disabled = false, note }: { label: string; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; note?: string }) {
  return (
    <label className={`flex min-h-12 items-center justify-between gap-4 py-1.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="text-[15.5px] font-bold">
        {label}
        {note && <span className="block text-[13px] font-normal text-muted">{note}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-[#8a919e] transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-navy peer-checked:after:translate-x-5 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy peer-disabled:opacity-50 motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </label>
  )
}

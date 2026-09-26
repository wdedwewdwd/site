export function RadioCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  children,
  aside,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
        checked ? "border-brand bg-white ring-1 ring-brand" : "border-line hover:border-subtle"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} className="size-5 shrink-0 accent-brand" />
      <span className="flex flex-1 flex-col gap-1">{children}</span>
      {aside}
    </label>
  );
}

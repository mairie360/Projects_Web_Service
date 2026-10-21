'use client';


export function FieldLabel({ htmlFor, label, required = false }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-[#57606a]">
      {label}
      {required && <span className="ml-1 text-[#cf222e]">*</span>}
    </label>
  );
}

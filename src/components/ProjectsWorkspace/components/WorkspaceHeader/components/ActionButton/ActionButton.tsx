'use client';

import { Button } from '@mairie360/lib-components/primitives';
import type { LucideIcon } from 'lucide-react';

export function ActionButton({
  label,
  icon: Icon,
  primary = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <span className="relative inline-flex">
      <Icon
        className={`pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${
          primary ? 'text-white' : 'text-[#2f3438]'
        }`}
        strokeWidth={2}
      />
      <Button
        label={label}
        variant={primary ? 'solid' : 'outline'}
        tone={primary ? 'primary' : 'neutral'}
        onClick={onClick}
        className={`!h-10 !min-h-0 !rounded-md !pl-10 !pr-4 !text-sm !font-semibold ${
          primary
            ? '!border-[#1256a6] !bg-[#1256a6] !text-white hover:!bg-[#0f4b92]'
            : '!border-[#d9d5d0] !bg-white !text-[#2f3438] hover:!border-[#b9d6d5] hover:!bg-[#fafafa]'
        }`}
      />
    </span>
  );
}

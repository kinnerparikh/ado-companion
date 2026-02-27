import { useState } from "react";

interface Props {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, count, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <span>
          {open ? "▼" : "▶"} {title}
        </span>
        <span className="text-gray-400 font-normal normal-case">{count}</span>
      </button>
      {open && children}
    </div>
  );
}

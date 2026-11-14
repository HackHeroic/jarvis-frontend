import { History } from "lucide-react";

interface SinceLastSpokeProps {
  note: string;
}

/**
 * Where the last conversation left off, on the first turn of a new one:
 * a quiet note above the reply, in the learning-moment notes' style. It is
 * not part of the assistant's message and never a toast.
 */
export function SinceLastSpoke({ note }: SinceLastSpokeProps) {
  return (
    <p role="note" className="mt-1 flex items-start gap-1.5 text-xs text-secondary">
      <History size={12} className="mt-0.5 shrink-0 text-dusk" />
      <span className="min-w-0 break-words">{note}</span>
    </p>
  );
}

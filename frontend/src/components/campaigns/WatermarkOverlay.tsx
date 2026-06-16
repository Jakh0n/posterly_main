import { WATERMARK_LABEL } from "@/lib/billing";

export interface WatermarkOverlayProps {
  className?: string;
}

/**
 * Visual watermark shown on free-tier poster previews. Matches the exported
 * watermark closely enough for honest preview UX.
 */
export function WatermarkOverlay({ className }: WatermarkOverlayProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage:
          "repeating-linear-gradient(-32deg, transparent, transparent 80px, rgba(255,255,255,0.12) 80px, rgba(255,255,255,0.12) 81px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(-32deg, transparent 0 40px, rgba(255,255,255,0.08) 40px 120px)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-x-16 gap-y-10 overflow-hidden p-4 opacity-25">
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="rotate-[-32deg] text-lg font-bold tracking-wide text-white drop-shadow-sm select-none"
          >
            {WATERMARK_LABEL}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-lg bg-black/50 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
        {WATERMARK_LABEL}
      </div>
    </div>
  );
}

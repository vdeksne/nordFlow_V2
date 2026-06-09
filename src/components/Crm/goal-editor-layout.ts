import { cn } from "@/lib/utils";

/** Overrides default centered modal shell - fullscreen scroll area, centered panel */
export const goalEditorDialogPopupClassName = cn(
  "fixed inset-0 z-50 flex max-h-none min-h-[100dvh] w-full max-w-none -translate-x-0 -translate-y-0 flex-col gap-0 overflow-y-auto overscroll-contain border-0 bg-transparent px-4 py-8 shadow-none ring-0 sm:px-6 sm:py-10 md:py-14",
  "data-starting-style:scale-100 data-ending-style:scale-100",
);

/** Inner card centered horizontally; capped height on large screens */
export const goalEditorInnerPanelClassName = cn(
  "border-white/8 bg-[color-mix(in_oklab,var(--card)_96%,transparent)] relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-none border shadow-[0_28px_100px_-36px_rgba(0,0,0,0.92)] ring-1 ring-white/[0.06] backdrop-blur-xl md:my-auto md:max-h-[min(880px,calc(100dvh-4rem))] md:flex-none",
);

"use client";
import { forwardRef } from "react";

/**
 * A button that fires reliably on a single tap in the Capacitor WebView.
 *
 * Plain onClick can be dropped on touch in the in-app WebView (a window-level
 * passive:false touchmove during the press, or touch-delay quirks, can cancel
 * the synthesized click). Firing on pointerup — the unified touch+mouse event —
 * is reliable. We guard against double-fire and respect `disabled`.
 *
 * Use this for in-game / in-scenario controls (Back, Restart, Pause, Pass,
 * Shoot, Kick off, etc.) instead of a raw <button onClick>.
 */
type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onTap: () => void;
};

export const TapButton = forwardRef<HTMLButtonElement, Props>(function TapButton(
  { onTap, disabled, style, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      style={{ touchAction: "manipulation", ...style }}
      // pointerup fires for both touch and mouse; click is a fallback for
      // keyboard/Enter activation and any environment without pointer events.
      onPointerUp={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        onTap();
      }}
      onClick={(e) => {
        // Only let click through for non-pointer activation (e.g. keyboard),
        // so we don't double-fire after pointerup on touch/mouse.
        if (e.detail !== 0) return; // detail===0 ⇒ not a real mouse click (keyboard)
        if (disabled) return;
        onTap();
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * The scan-to-join QR card. Generated in the browser (QR encoding is CPU-heavy
 * pure JS — doing it per request on the Worker risks the CPU limit), so the
 * page render stays light.
 */
export function ScanToJoin({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#241d13", light: "#00000000" } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [url]);

  if (!svg) return null;
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-xl bg-espresso/95 p-3 pr-4 shadow-xl backdrop-blur">
      <div
        className="h-16 w-16 rounded-md bg-white p-1.5 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-gold-soft">Join the fan club</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7bca4]">Scan to join</p>
      </div>
    </div>
  );
}

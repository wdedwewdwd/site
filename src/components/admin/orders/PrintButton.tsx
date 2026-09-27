"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary py-2.5 print:hidden">
      <Printer className="size-4" /> چاپ
    </button>
  );
}

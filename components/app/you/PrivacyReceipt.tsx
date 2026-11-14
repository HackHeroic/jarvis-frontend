import { Cpu } from "lucide-react";
import { receiptLine, receiptWindow } from "@/lib/you";
import type { Receipt } from "@/lib/types";

interface PrivacyReceiptProps {
  receipt: Receipt;
}

/** Where the user's model calls ran over the receipt's window (30 days), never "all time". */
export function PrivacyReceipt({ receipt }: PrivacyReceiptProps) {
  const period = receiptWindow(receipt.since, new Date());
  return (
    <div className="flex items-start gap-3">
      <Cpu size={18} className="mt-0.5 shrink-0 text-sage" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">{receiptLine(receipt)}</p>
        <p className="mt-1 text-xs text-secondary">
          Model calls{period ? ` ${period}` : ""}. A redaction is a personal detail, like an
          email address, removed before anything goes to the cloud.
        </p>
      </div>
    </div>
  );
}

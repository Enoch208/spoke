"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { chooseQuickActions } from "@/lib/accounts/quick-actions";
import type { ModalComponentProps } from "@/components/app/modal-types";

export default function QuickActionsModal({ close }: ModalComponentProps<"M-09">) {
  const [cap, setCap] = useState("100");
  const valid = /^\d+(\.\d{1,6})?$/.test(cap) && Number(cap) > 0;
  const choose = (choice: "allow" | "ask") => {
    chooseQuickActions(choice, valid ? parseUnits(cap, 6).toString() : "100000000");
    close();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) choose("ask");
      }}
      title="Allow quick actions?"
      subtitle="Choose once on this device. You can change this in Security."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              choose("ask");
            }}
          >
            Ask every time
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              choose("allow");
            }}
          >
            Allow
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>
          After one passkey prompt, sharing links, small purchases, finalizing and claiming can use
          a signing session. The session ends on reload, sign-out or after 15 minutes idle.
        </p>
        <Field label="Up to SDUSD per purchase">
          <Input
            value={cap}
            inputMode="decimal"
            onChange={(event) => {
              setCap(event.target.value);
            }}
          />
        </Field>
        <p className="text-subtle text-sm">
          Deposits, refunds, withdrawals, new campaign terms and security changes always ask for
          your passkey.
        </p>
      </div>
    </Dialog>
  );
}

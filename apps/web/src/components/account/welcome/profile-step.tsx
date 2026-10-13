"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { welcomeCopy as copy } from "../copy/welcome";
import { AvatarPicker } from "../shared/avatar-picker";
import { HandleField } from "../shared/handle-field";
import { PieceAvatar } from "../shared/piece-avatar";
import type { Welcome } from "./use-welcome";

export function WelcomeProfile({ flow }: { flow: Welcome }) {
  return (
    <>
      <Field
        label={copy.name}
        optional
        error={flow.nameInvalid ? "Use up to 40 characters, without a web address." : undefined}
      >
        <Input
          value={flow.name}
          maxLength={40}
          autoComplete="name"
          onChange={(event) => {
            flow.setName(event.target.value);
          }}
        />
      </Field>
      <HandleField value={flow.handle} onChange={flow.setHandle} check={flow.check} />
      <AvatarPicker base={flow.me.address} value={flow.avatar} onChange={flow.setAvatar} />
      <div className="bg-soft flex items-center gap-3 rounded-xl p-3">
        <PieceAvatar seed={flow.avatar} size="md" />
        <p className="text-ink text-sm">
          {flow.name || "Your profile"}
          {flow.handle ? ` · @${flow.handle}` : ""}
        </p>
      </div>
      <p className="text-subtle text-sm">{copy.privacy}</p>
    </>
  );
}

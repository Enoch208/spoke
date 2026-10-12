export type ToastDuration = number | "sticky" | "untilResolved" | "untilOnline" | "untilWaitEnds";

type Variants<Value> = Readonly<Record<string, Value>>;

export type ToastCopy = {
  readonly name: string;
  readonly copy: string | Variants<string>;
  readonly duration: ToastDuration | Variants<ToastDuration>;
  readonly actions: readonly string[];
  readonly perNotification?: true;
};

export type PerActionToast = {
  readonly name: string;
  readonly duration: ToastDuration;
  readonly perAction: true;
};

export type ToastId = `T-${string}`;

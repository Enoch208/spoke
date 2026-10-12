export type EmptyStateIllustration = `IMG-${string}` | `code:${string}`;

export type EmptyStateCopy =
  | {
      readonly list: string;
      readonly title: string;
      readonly body?: string;
      readonly actions?: readonly string[];
      readonly merchantActions?: readonly string[];
      readonly illustration?: EmptyStateIllustration;
    }
  | {
      readonly list: string;
      readonly insightStates: readonly string[];
    };

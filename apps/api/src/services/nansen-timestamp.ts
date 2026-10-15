import { z } from "zod";
export const nansenTimestamp = z
  .string()
  .max(40)
  .transform((value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value) ? `${value}Z` : value,
  )
  .pipe(z.iso.datetime({ offset: true }))
  .transform((value) => new Date(value).toISOString());

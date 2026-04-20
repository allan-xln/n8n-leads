import { z } from "zod";

export const configSchema = z.object({
  destinationWhatsApp: z.string().trim().default(""),
  leadLimit: z.number().int().min(1).max(100),
  runTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  niches: z.array(z.string().trim().min(1)).min(1),
  cities: z.array(z.string().trim().min(1)).min(1),
  nationwide: z.boolean().default(false),
  priorityCities: z.array(z.string().trim().min(1)).default([]),
  secondaryCities: z.array(z.string().trim().min(1)).default([]),
  active: z.boolean()
});

export const configInputSchema = z.object({
  destinationWhatsApp: z.string().trim().default(""),
  leadLimit: z.coerce.number().int().min(1).max(100),
  runTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  niches: z.array(z.string().trim().min(1)).min(1),
  cities: z.array(z.string().trim().min(1)).default([]),
  nationwide: z.union([z.boolean(), z.string()]).optional().transform((value) => {
    if (value === undefined) {
      return false;
    }

    if (typeof value === "boolean") {
      return value;
    }

    return value.toLowerCase() === "true";
  }),
  priorityCities: z.array(z.string().trim().min(1)).default([]),
  secondaryCities: z.array(z.string().trim().min(1)).default([]),
  active: z.union([z.boolean(), z.string()]).transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    return value.toLowerCase() === "true";
  })
});

export const runInputSchema = z.object({
  reason: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

import { z } from "zod";

export const generalSettingsSchema = z.object({
  orgId: z.string(),
  propertyType: z.string(),
  propertyName: z.string(),
  propertyPhone: z.string(),
  propertyEmail: z.string().email(),
  propertyWebsite: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  country: z.string(),
  street: z.string(),
  suite: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  photos: z.array(z.string()).optional(), // array of uploaded URLs
  printHeaderImage: z.string().optional(),
  description: z.any().optional(), // assuming Tiptap JSON
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

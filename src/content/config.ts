import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.string().array(),
  }),
});

export const collections = { blog };

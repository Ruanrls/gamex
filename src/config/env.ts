import z from "zod";

const envSchema = z.object({
    solanaCluster: z.string(),
    apiUrl: z.string().optional()
})

export const env = envSchema.parse({
    solanaCluster: import.meta.env.VITE_SOLANA_CLUSTER,
    apiUrl: import.meta.env.VITE_API_URL
})
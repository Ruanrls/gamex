import z from "zod";

const envSchema = z.object({
    solanaCluster: z.string()  
})

export const env = envSchema.parse({
    solanaCluster: import.meta.env.VITE_SOLANA_CLUSTER
})
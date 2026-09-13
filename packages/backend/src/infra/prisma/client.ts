import { PrismaClient } from '@prisma/client';

// Single shared instance, standard practice to avoid exhausting DB
// connections when using tsx watch / hot-reload in dev.
export const prisma = new PrismaClient();

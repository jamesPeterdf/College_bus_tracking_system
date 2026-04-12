const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
    PORT: z.string().default('5000'),
    JWT_SECRET: z.string(),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD_HASH: z.string(),
    GROQ_API_KEY: z.string(),
    PROJECT_URL: z.string().url(),
    SERVICE_ROLE: z.string(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const validateEnv = () => {
    try {
        envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            process.exit(1);
        }
    }
};

module.exports = validateEnv;

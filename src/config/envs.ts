import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  NATS_SERVERS: string[];
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const validationSchema = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});
const error: joi.ValidationError | undefined = validationSchema.error;
const value: EnvVars = validationSchema.value as EnvVars;
if (error) {
  throw new Error('Config Validation error: ' + error.message);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  database_url: envVars.DATABASE_URL,
  nats_servers: envVars.NATS_SERVERS,
};

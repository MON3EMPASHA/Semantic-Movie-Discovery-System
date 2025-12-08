import express from 'express';
import cors from 'cors';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import OpenAI from 'openai';

loadEnv();

const envSchema = z.object({
  PORT: z.string().default('5050'),
  OPENAI_API_KEY: z.string(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment for embedding service');
}

const env = {
  ...parsedEnv.data,
  port: Number(parsedEnv.data.PORT),
};

const app = express();
const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/embed', async (req, res) => {
  const schema = z.object({
    text: z.string().min(1),
    model: z.string().optional(),
  });

  const body = schema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json(body.error.flatten());
  }

  try {
    const response = await client.embeddings.create({
      model: body.data.model ?? env.EMBEDDING_MODEL,
      input: body.data.text,
    });

    const [embedding] = response.data;

    if (!embedding?.embedding) {
      return res.status(500).json({ message: 'Embedding generation failed' });
    }

    return res.json({
      vector: embedding.embedding,
      dimensions: embedding.embedding.length,
      model: response.model,
    });
  } catch (error) {
    console.error('Embedding error', error);
    return res.status(500).json({ message: 'Embedding service error' });
  }
});

app.listen(env.port, () => {
  console.log(`Embedding service listening on port ${env.port}`);
});


import axios from "axios";
import { env } from "../config/env";
import { getEmbeddingClient } from "../config/embeddingClient";
import { logger } from "../utils/logger";

interface EmbeddingServiceResponse {
  vector: number[];
}

// Cache results of model preflight checks to avoid repeated API calls
const modelPreflightCache: Record<string, boolean> = {};

/**
 * Check that the model exists and the current token (if provided) has access.
 * Throws a descriptive error on 401/403/404 so callers can provide actionable messages.
 */
const checkHuggingFaceModelAccessible = async (model: string) => {
  if (modelPreflightCache[model]) return true;

  try {
    logger.info(`Checking Hugging Face model availability: ${model}`);
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (env.HUGGINGFACE_API_KEY) {
      headers.Authorization = `Bearer ${env.HUGGINGFACE_API_KEY}`;
    }

    const resp = await axios.get(`https://huggingface.co/api/models/${model}`, {
      headers,
      timeout: 10000,
    });

    if (resp.status === 200) {
      modelPreflightCache[model] = true;
      return true;
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 404) {
        throw new Error(
          `Hugging Face model not found or inaccessible: ${model} (404). Verify model slug and token access.`
        );
      }
      if (status === 401 || status === 403) {
        throw new Error(
          `Hugging Face API authorization failed (status ${status}). Check HUGGINGFACE_API_KEY and required scopes.`
        );
      }
    }
    throw err;
  }
};

/**
 * Generate embeddings using Hugging Face Inference API (free tier)
 * Note: First request may take time if model is loading (cold start)
 */
const generateHuggingFaceEmbedding = async (
  text: string,
  retries = 3
): Promise<number[]> => {
  if (!env.HUGGINGFACE_API_KEY) {
    throw new Error(
      "HUGGINGFACE_API_KEY is required for Hugging Face embeddings"
    );
  }

  // Preflight check: ensure model exists and token (if any) has access
  await checkHuggingFaceModelAccessible(env.EMBEDDING_MODEL);

  try {
    // Use the Hugging Face Inference Router API with models endpoint
    // Note: api-inference.huggingface.co is deprecated and returns 410 Gone.
    // New base: https://router.huggingface.co/models/{model_id}
    const response = await axios.post<
      number[][] | { error: string; estimated_time?: number }
    >(
      `https://router.huggingface.co/models/${env.EMBEDDING_MODEL}`,
      { inputs: text },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // Handle model loading case
    if ("error" in response.data && response.data.error) {
      if (response.data.error.includes("loading") && retries > 0) {
        const waitTime = (response.data.estimated_time || 10) * 1000;
        logger.info(`Model loading, waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return generateHuggingFaceEmbedding(text, retries - 1);
      }
      throw new Error(`Hugging Face API error: ${response.data.error}`);
    }

    // HF returns array of arrays, we need the first one
    const data = response.data as number[][];
    const embedding =
      Array.isArray(data) && Array.isArray(data[0])
        ? data[0]
        : (data as unknown as number[]);

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding response from Hugging Face");
    }

    return embedding;
  } catch (error) {
    // If HF router returns 503 it usually means model is still loading (cold start)
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const xError = error.response?.headers?.["x-error-message"] || "";

      if (status === 503 && retries > 0) {
        logger.info("Model loading, retrying in 10 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return generateHuggingFaceEmbedding(text, retries - 1);
      }

      if (status === 410) {
        logger.error(
          "Hugging Face endpoint returned 410 Gone. Header message:",
          xError || error.response?.data || ""
        );
        throw new Error(
          "Hugging Face API returned 410 Gone: the old api-inference.huggingface.co endpoint is deprecated. Update to use router.huggingface.co or change EMBEDDING_PROVIDER."
        );
      }
    }

    throw error;
  }
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!text || !text.trim()) {
    throw new Error("Cannot generate embedding for empty text");
  }

  try {
    // Option 1: Use external embedding service
    if (env.EMBEDDING_PROVIDER === "service" && env.EMBEDDING_SERVICE_URL) {
      const response = await axios.post<EmbeddingServiceResponse>(
        `${env.EMBEDDING_SERVICE_URL}/embed`,
        {
          text,
          model: env.EMBEDDING_MODEL,
        }
      );
      if (!response.data?.vector) {
        throw new Error("Embedding service response missing vector");
      }
      return response.data.vector;
    }

    // Option 2: Use Hugging Face (free tier)
    if (env.EMBEDDING_PROVIDER === "huggingface") {
      return await generateHuggingFaceEmbedding(text);
    }

    // Option 3: Use OpenAI (fallback, requires API key)
    if (env.EMBEDDING_PROVIDER === "openai" || env.OPENAI_API_KEY) {
      const client = getEmbeddingClient();
      const embeddingResponse = await client.embeddings.create({
        model: env.EMBEDDING_MODEL,
        input: text,
      });

      const [embedding] = embeddingResponse.data;

      if (!embedding?.embedding) {
        throw new Error("Embedding response did not include vector data");
      }

      return embedding.embedding;
    }

    throw new Error(
      "No embedding provider configured. Set EMBEDDING_PROVIDER and required API keys."
    );
  } catch (error) {
    logger.error("Failed to generate embedding", error);
    throw error;
  }
};

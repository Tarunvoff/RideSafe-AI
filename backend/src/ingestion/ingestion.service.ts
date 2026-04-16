import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const LOSS_CURVE = {
  RAIN: { loss_per_severity: 650, payout_ratio: 0.75 },
  FLOOD: { loss_per_severity: 1800, payout_ratio: 0.65 },
  PROTEST: { loss_per_severity: 400, payout_ratio: 0.8 },
  STRIKE: { loss_per_severity: 350, payout_ratio: 0.85 },
  OTHER: { loss_per_severity: 300, payout_ratio: 0.7 },
} as const;

const DisruptionSchema = z.object({
  type: z.enum(['RAIN', 'FLOOD', 'PROTEST', 'STRIKE', 'OTHER']),
  title: z.string().min(5).max(100),
  severityScore: z.number().min(0).max(1),
  affectedZones: z.array(z.string()).optional(),
});

const GeminiDisruptionEnvelopeSchema = z.object({
  disruptions: z.array(DisruptionSchema),
});

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private static readonly NEWSDATA_TIMEOUT_MS = 20000;
  private static readonly GEMINI_TIMEOUT_MS = 20000;

  constructor(private readonly prisma: PrismaService) { }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
    source: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(`${source} request timed out after ${timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async safeParseJsonResponse(res: Response, source: string): Promise<any | null> {
    const raw = await res.text();
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      this.logger.warn(
        `${source} returned HTTP ${res.status} (${res.statusText}). Body preview: ${raw.slice(0, 180)}`,
      );
      return null;
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      this.logger.warn(
        `${source} returned non-JSON content-type=${contentType}. Body preview: ${raw.slice(0, 180)}`,
      );
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (e) {
      this.logger.warn(
        `${source} returned invalid JSON. Body preview: ${raw.slice(0, 180)}`,
      );
      return null;
    }
  }

  /**
   * Automatically executes every 10 minutes to ingest live APIs (Newsdata.io) 
   * exactly matching the parameters: domestic, tamil, english!
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async ingestFromNewsData() {
    this.logger.log('Executing NewsData.io Civil Disruption Sweep...');

    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
      this.logger.warn('Skipping Ingestion: NEWSDATA_API_KEY is missing from .env');
      return;
    }

    try {
      // 1. Fetch live raw Tamil + English domestic news specifically querying disruption keywords.
      const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&category=domestic&language=en,ta&q=strike OR protest OR flood OR curfew OR bandh OR heavy rain OR cyclone`;
      const res = await this.fetchWithTimeout(
        url,
        { method: 'GET' },
        IngestionService.NEWSDATA_TIMEOUT_MS,
        'NewsData.io',
      );
      const data = await this.safeParseJsonResponse(res, 'NewsData.io');
      if (!data) return;

      if (data.status && data.status !== 'success') {
        this.logger.warn(`NewsData.io returned status=${data.status}. message=${data.message || 'n/a'}`);
        return;
      }

      if (!data.results || data.results.length === 0) {
        this.logger.log('No civil disruptions detected in the 10-minute sweep.');
        return;
      }

      // 2. Routing to Gemini AI for deterministic verification...
      const articles = data.results.map((r: any) => ({
        title: r.title,
        desc: r.description,
        link: r.link,
        city: r.country && r.country.length > 0 ? r.country[0] : "India"
      }));

      this.logger.log(`Found ${articles.length} potential disruption articles. Routing to Agentic Gemini AI...`);
      const geminiResult = await this.analyzeWithGemini(articles);

      // 3. Drop extracted verified strikes/floods right into Postgres
      if (geminiResult && geminiResult.disruptions) {
        for (const event of geminiResult.disruptions) {
          try {
            const duplicate = await (this.prisma as any).disruptionEvent.findFirst({
              where: { title: event.title }
            });

            if (!duplicate) {
              await (this.prisma as any).disruptionEvent.create({
                data: {
                  type: event.type,
                  title: event.title,
                  expectedLoss: Math.round(event.severityScore * 800),
                  expectedPayout: Math.round(event.severityScore * 400),
                  verified: true,
                  occurredAt: new Date(),
                }
              });
              this.logger.log(`🚨 [AUTO-TRIGGER] Inserted Verified Disruption: [${event.type}] ${event.title}`);
            }
          } catch (dbErr) {
            this.logger.error(`DATABASE_INSERT_FAILURE for event "${event.title}":`, dbErr);
          }
        }
      }

    } catch (e) {
      this.logger.error('Fatal pipeline error during NewsData.io ingestion.', e as Error);
    }
  }

  /**
   * Tool: Verify if a city has active driver H3 zones
   */
  private async verifyH3Location(city: string): Promise<boolean> {
    try {
      const count = await (this.prisma as any).kYCPersonalDetails.count({
        where: { city: { contains: city, mode: 'insensitive' } }
      });
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * AI Data Extraction Layer (Gemini 1.5 Flash with Agentic Tools & Structured Outputs)
   */
  private async analyzeWithGemini(articles: any[]) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      this.logger.warn('Skipping AI Filter: GEMINI_API_KEY is missing.');
      return null;
    }

    const requestedModel = (process.env.GEMINI_MODEL ?? '').trim();
    const modelCandidates = Array.from(
      new Set(
        [requestedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-8b-latest']
          .filter((m) => !!m),
      ),
    );

    const prompt = `
      You are the Aegis Machine Learning Engine protecting gig drivers. Read these live real-world news articles:
      ${JSON.stringify(articles)}
      
      Identify if the articles confirm a real, physical disruption happening right now in India.
      Disregard sports, movies, politics, or financial "strikes/deals" that do not affect physical logistics.

      ### Few-Shot Examples for Calibration:
      
      Example 1 (True Positive - Physical):
      Input: "Heavy rains lash Chennai, major subways flooded, public transport halted."
      Output: { "disruptions": [ { "type": "Flood / Zone Inundation", "title": "Chennai Subway Flooding", "severityScore": 0.88 } ] }
      
      Example 2 (False Positive - Non-Physical):
      Input: "Software engineers strike a major deal with tech giants for hybrid work."
      Output: { "disruptions": [] }
      
      Example 3 (True Positive - Ambiguous):
      Input: "Bharat Bandh: Farmers block highways in Bangalore, trade unions join strike."
      Output: { "disruptions": [ { "type": "Civic Bandh / Strike", "title": "Bharat Bandh: Highway Blockade", "severityScore": 0.95 } ] }
      
      Example 4 (False Positive - Policy/News):
      Input: "Government announces new insurance policy for Zomato and Swiggy workers."
      Output: { "disruptions": [] }
      
      CRITICAL: Use the verify_h3_location tool for any city mentioned in high-severity articles to ensure we possess active driver coverage there.
      `;

    // Define Schema for Structured Output
    const responseSchema = {
      type: "object",
      properties: {
        disruptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["Civic Bandh / Strike", "Local Protest / Curfew", "Heavy Rain (>60mm)", "Flood / Zone Inundation"]
              },
              title: { type: "string" },
              severityScore: { type: "number", description: "Scale 0.0 to 1.0" }
            },
            required: ["type", "title", "severityScore"]
          }
        }
      }
    };

    try {
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: responseSchema
        },
        tools: [{
          function_declarations: [{
            name: "verify_h3_location",
            description: "Check if Aegis has active driver zones in a specific city in India.",
            parameters: {
              type: "object",
              properties: { city: { type: "string" } },
              required: ["city"]
            }
          }]
        }]
      };

      let res: Response | null = null;
      let selectedModel: string | null = null;
      let selectedApiVersion: 'v1beta' | 'v1' = 'v1beta';
      const apiVersions: Array<'v1beta' | 'v1'> = ['v1beta', 'v1'];
      const failedAttempts: string[] = [];

      for (const apiVersion of apiVersions) {
        for (const model of modelCandidates) {
          const tryRes = await this.fetchWithTimeout(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            },
            IngestionService.GEMINI_TIMEOUT_MS,
            `Gemini API (${apiVersion}/${model})`,
          );

          if (tryRes.ok) {
            res = tryRes;
            selectedModel = model;
            selectedApiVersion = apiVersion;
            break;
          }

          if (tryRes.status === 404) {
            failedAttempts.push(`${apiVersion}/${model}:404`);
            continue;
          }

          const non404Text = await tryRes.text();
          failedAttempts.push(`${apiVersion}/${model}:${tryRes.status}:${non404Text.slice(0, 80)}`);
          res = tryRes;
          selectedModel = model;
          selectedApiVersion = apiVersion;
          break;
        }

        if (res && selectedModel) {
          break;
        }
      }

      if (!res || !selectedModel) {
        this.logger.warn(
          `Gemini API failed: no valid model resolved from fallback list. Attempts=${failedAttempts.slice(0, 6).join(' | ')}`,
        );
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn(
          `Gemini API failed with status ${res.status} for ${selectedApiVersion}/${selectedModel}. Error: ${errorText.slice(0, 100)}`,
        );
        return null;
      }

      this.logger.log(`Gemini request resolved via ${selectedApiVersion}/${selectedModel}`);

      const jsonRes = await this.safeParseJsonResponse(res, 'Gemini API');
      if (!jsonRes || !jsonRes.candidates || !jsonRes.candidates[0].content) return null;

      const content = jsonRes.candidates[0].content;

      // ── Agentic Tool Calling Logic ─────────────────────────────────────────
      if (content.parts[0].functionCall) {
        const call = content.parts[0].functionCall;
        if (call.name === 'verify_h3_location') {
          const city = call.args.city;
          const isCovered = await this.verifyH3Location(city);

          this.logger.log(`Agent called verify_h3_location("${city}") -> Result: ${isCovered}`);

          // Follow-up with the tool result to get final structured output
          const toolResponseRes = await this.fetchWithTimeout(
            `https://generativelanguage.googleapis.com/${selectedApiVersion}/models/${selectedModel}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  { parts: [{ text: prompt }] },
                  content,
                  { parts: [{ functionResponse: { name: 'verify_h3_location', response: { content: isCovered } } }] }
                ],
                generationConfig: { response_mime_type: "application/json", response_schema: responseSchema }
              }),
            },
            IngestionService.GEMINI_TIMEOUT_MS,
            'Gemini Tool Followup',
          );
          const followUpJson = await this.safeParseJsonResponse(toolResponseRes, 'Gemini Tool Followup');
          if (!followUpJson?.candidates?.[0]?.content?.parts?.[0]?.text) return null;
          return JSON.parse(followUpJson.candidates[0].content.parts[0].text);
        }
      }

      // Native Structured Output (no tool call needed)
      if (content.parts[0].text) {
        return JSON.parse(content.parts[0].text);
      }

      return null;
    } catch (e) {
      this.logger.error('Gemini Classification API Failed.', e);
      return null;
    }
  }
}

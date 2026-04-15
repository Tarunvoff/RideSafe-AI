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

  constructor(private readonly prisma: PrismaService) {}

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
    
    // Using environment variables explicitly loaded via `.env`
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
      if (!data) {
        return;
      }

      if (data.status && data.status !== 'success') {
        this.logger.warn(`NewsData.io returned status=${data.status}. message=${data.message || 'n/a'}`);
        return;
      }
      
      if (!data.results || data.results.length === 0) {
         this.logger.log('No civil disruptions detected in the 10-minute sweep.');
         return;
      }

      // 2. Send the chaotic raw string texts through Gemini to structure into Parametric Data
      const articles = data.results.map((r: any) => ({ title: r.title, desc: r.description, link: r.link }));
      this.logger.log(`Found ${articles.length} potential disruption articles. Routing to Gemini AI for deterministic verification...`);
      
      const geminiResult = await this.analyzeWithGemini(articles);
      
      // 3. Drop extracted verified strikes/floods right into TimescaleDB / Postgres!
      if (geminiResult && geminiResult.disruptions) {
         for (const event of geminiResult.disruptions) {
            
            // Check if we already logged this exact protest/flood in the DB recently
            const duplicate = await this.prisma.disruptionEvent.findFirst({
               where: { title: event.title }
            });

            if (!duplicate) {
               const lossConfig = LOSS_CURVE[event.type] ?? LOSS_CURVE.OTHER;
               const expectedLoss = Math.round(event.severityScore * lossConfig.loss_per_severity);
               const expectedPayout = Math.round(expectedLoss * lossConfig.payout_ratio);

               await this.prisma.disruptionEvent.create({
                   data: {
                   type: event.type,
                      title: event.title,
                   expectedLoss,
                   expectedPayout,
                   verified: false,
                      occurredAt: new Date(),
                   }
                });
               this.logger.log(`[DISRUPTION_PENDING_REVIEW] Added event type=${event.type} title=${event.title}`);
            }
         }
      }

    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const lower = message.toLowerCase();
      if (lower.includes('fetch failed') || lower.includes('timed out')) {
        this.logger.warn(`NewsData.io ingestion skipped due to upstream network failure: ${message}`);
        return;
      }
      this.logger.error('Fatal pipeline error during NewsData.io ingestion.', e as Error);
    }
  }

  /**
   * AI Data Extraction Layer (Gemini LLM)
   * Prevents false-positives (e.g., "Company strikes a deal" vs "Protest Strike")
   */
  private async analyzeWithGemini(articles: any[]) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
          this.logger.warn('Skipping AI Filter: GEMINI_API_KEY is missing.');
          return null;
      }
      
      const prompt = `
      You are the Aegis Machine Learning Engine protecting gig drivers. Read these live real-world news articles:
      ${JSON.stringify(articles)}
      
      Identify if the articles confidently confirm a real, physical disruption happening right now in India (such as Chennai, Bangalore, etc).
      Disregard sports, movies, politics, or financial "strikes/deals" that do not affect physical logistics.
      
      Return ONLY a pure JSON object mapping strictly to these Aegis DB Types: 
      "Civic Bandh / Strike", "Local Protest / Curfew", "Heavy Rain (>60mm)", "Flood / Zone Inundation".
      
      Format exactly like this strictly valid JSON string: 
      { "disruptions": [ { "type": "Civic Bandh / Strike", "title": "Chennai Transport Strike starts today", "severityScore": 0.85 } ] }
      `;

      try {
          // Fallback to Native Node fetch (No SDK needed, hyper-fast and lightweight)
          const res = await this.fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            },
            IngestionService.GEMINI_TIMEOUT_MS,
            'Gemini API',
          );
            const jsonRes = await this.safeParseJsonResponse(res, 'Gemini API');
            if (!jsonRes) return null;
          
          if (!jsonRes.candidates || !jsonRes.candidates[0].content) return null;
          
          const text = jsonRes.candidates[0].content.parts[0].text;
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          const validated = GeminiDisruptionEnvelopeSchema.safeParse(parsed);
          if (!validated.success) {
            this.logger.warn(`Gemini output validation failed: ${validated.error.message}`);
            return null;
          }
          return validated.data;
      } catch (e) {
          this.logger.error('Gemini Classification API Failed', e);
          return null;
      }
  }
}

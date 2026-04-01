import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      const res = await fetch(url);
      const data = await res.json();
      
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
            const duplicate = await (this.prisma as any).disruptionEvent.findFirst({
               where: { title: event.title }
            });

            if (!duplicate) {
                await (this.prisma as any).disruptionEvent.create({
                   data: {
                      type: event.type, // 'Civic Bandh / Strike', 'Heavy Rain (>60mm)', 'Flood / Zone Inundation'
                      title: event.title,
                      expectedLoss: Math.round(event.severityScore * 800), // AI severity mapping
                      expectedPayout: Math.round(event.severityScore * 400),
                      verified: true,
                      occurredAt: new Date(),
                   }
                });
                this.logger.log(`🚨 [AUTO-TRIGGER] Inserted Verified Disruption: [${event.type}] ${event.title}`);
            }
         }
      }

    } catch (e) {
      this.logger.error('Fatal pipeline error during NewsData.io ingestion.', e);
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
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const jsonRes = await res.json();
          
          if (!jsonRes.candidates || !jsonRes.candidates[0].content) return null;
          
          const text = jsonRes.candidates[0].content.parts[0].text;
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
      } catch (e) {
          this.logger.error('Gemini Classification API Failed', e);
          return null;
      }
  }
}

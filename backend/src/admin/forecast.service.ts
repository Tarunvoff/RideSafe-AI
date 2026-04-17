import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  /**
   * Fetches a 7-day weather forecast using the Open-Meteo API.
   * This is used for predictive loss forecasting on the admin dashboard.
   */
  async get7DayForecast(lat: number, lng: number) {
    // Open-Meteo is chosen as the baseline because it requires no API key 
    // and provides reliable daily aggregates.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_sum&current_weather=true&timezone=auto`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo API returned status ${response.status}`);
      }

      const data = await response.json();
      const daily = data.daily;

      if (!daily || !daily.time) {
        throw new Error('Invalid response structure from Open-Meteo');
      }

      return daily.time.map((time: string, index: number) => ({
        date: time,
        temp: daily.temperature_2m_max[index] ?? 25,
        rain: daily.precipitation_sum[index] ?? 0,
        aqi: 80, // Open-Meteo doesn't provide AQI in basic daily, using a safe baseline
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch 7-day forecast for (${lat}, ${lng}): ${err.message}`);
      return null;
    }
  }
}

export interface ITelemetryAdapter {
  publishLocation(payload: {
    driverId: string;
    lat: number;
    lng: number;
    speed?: number;
    timestamp?: number;
    platform: string;
  }): Promise<void>;
}

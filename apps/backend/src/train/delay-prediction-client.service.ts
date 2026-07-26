import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import {firstValueFrom} from 'rxjs';
import {DelayPredictionRequestDto} from './dto/delay-prediction-request.dto';
import {DelayPredictionResponseDto} from './dto/delay-prediction-response.dto';

@Injectable()
export class DelayPredictionClientService {
  private readonly logger = new Logger(DelayPredictionClientService.name);
  private readonly baseUrl = process.env.PREDICTOR_BASE_URL ?? 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Calls the external delay predictor service to estimate a delay.
   *
   * @param request - The feature payload for the prediction.
   * @returns The prediction response, or `null` if the call fails.
   */
  async predictDelay(request: DelayPredictionRequestDto): Promise<DelayPredictionResponseDto | null> {
    try {
      const {data} = await firstValueFrom(
        this.httpService.post<DelayPredictionResponseDto>(`${this.baseUrl}/predict/delay`, request, {
          timeout: 10000,
        }),
      );
      return data;
    } catch (err) {
      this.logger.error('Failed to call delay predictor', err);
      return null;
    }
  }

  /**
   * Checks the health of the external delay predictor service.
   *
   * @returns The health status, or `null` if the check fails.
   */
  async health(): Promise<{status: string; model: string} | null> {
    try {
      const {data} = await firstValueFrom(
        this.httpService.get<{status: string; model: string}>(`${this.baseUrl}/health`, {
          timeout: 5000,
        }),
      );
      return data;
    } catch (err) {
      this.logger.warn('Delay predictor health check failed', err);
      return null;
    }
  }
}

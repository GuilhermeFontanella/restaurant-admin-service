import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface CreateTenantParams {
  slug: string;
  nome: string;
  adminEmail: string;
  adminSenha: string;
}

export interface CreateTenantResponse {
  tenantId: string;
  slug: string;
  databaseName: string;
  adminEmail: string;
}

@Injectable()
export class KitchenServiceClient {
  private readonly logger = new Logger(KitchenServiceClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('KITCHEN_SERVICE_URL', 'http://localhost:3000');
    this.apiKey = config.get<string>('KITCHEN_SERVICE_INTERNAL_API_KEY', '');
  }

  async createTenant(params: CreateTenantParams): Promise<CreateTenantResponse> {
    return this.request<CreateTenantResponse>('post', '/internal/tenants', params);
  }

  async setTenantAtivo(slug: string, ativo: boolean): Promise<void> {
    await this.request('patch', `/internal/tenants/${encodeURIComponent(slug)}`, { ativo });
  }

  private async request<T>(method: 'post' | 'patch', path: string, data: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          method,
          url: `${this.baseUrl}${path}`,
          data,
          headers: { 'X-Internal-Api-Key': this.apiKey },
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string | string[] }>;
      const message = axiosError.response?.data?.message ?? axiosError.message;
      this.logger.error(`Falha ao chamar kitchen-service (${method.toUpperCase()} ${path}): ${message}`);
      throw new BadGatewayException(`Falha ao comunicar com o order-manager: ${message}`);
    }
  }
}

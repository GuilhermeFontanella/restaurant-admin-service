import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KitchenServiceClient } from './kitchen-service-client.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [KitchenServiceClient],
  exports: [KitchenServiceClient],
})
export class KitchenServiceClientModule {}

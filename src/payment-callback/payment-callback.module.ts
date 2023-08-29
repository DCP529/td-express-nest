import { Module } from '@nestjs/common';
import { PaymentCallbackController } from './payment-callback.controller';

@Module({
  controllers: [PaymentCallbackController]
})
export class PaymentCallbackModule {}

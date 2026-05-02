import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { KafkaConsumer } from './kafka.consumer';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, KafkaConsumer],
})
export class AppModule {}

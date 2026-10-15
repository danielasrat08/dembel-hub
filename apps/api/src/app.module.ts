import { Module } from '@nestjs/common';
import { DbModule } from './db/service/db.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [DbModule, CommonModule, AuthModule, AdminModule],
  controllers: [HealthController],
})
export class AppModule {}

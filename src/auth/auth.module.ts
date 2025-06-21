import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule],
  providers: [AuthService, Logger],
  exports: [AuthService]
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListsController } from './lists.controller';
import { StaffController } from './staff.controller';
import { TeamsController } from './teams.controller';

@Module({ imports: [AuthModule], controllers: [StaffController, TeamsController, ListsController] })
export class AdminModule {}

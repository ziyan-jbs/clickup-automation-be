import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ClickUpTask, UserPreference } from "@/entities";
import { AuthModule } from "@/routes/auth/auth.module";
import { TaskController } from "@/routes/task/task.controller";
import { TaskService } from "@/routes/task/task.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ClickUpTask, UserPreference])],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}

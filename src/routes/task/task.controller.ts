import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { ListTasksQuery } from "@/routes/task/dto/list-tasks.query";
import { TaskService } from "@/routes/task/task.service";

@ApiTags("tasks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TaskController {
  constructor(private readonly taskService: TaskService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTasksQuery) { return this.taskService.list(user.id, query); }
  @Get(":id") get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.taskService.get(user.id, id); }
}

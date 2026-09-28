import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@/entities/user.entity";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { RolesGuard } from "@/routes/auth/roles.guard";
import { Roles } from "@/routes/auth/roles.decorator";
import { CreateRepDto, UpdateUserStatusDto } from "@/routes/users/users.dto";
import { UsersService } from "@/routes/users/users.service";
@ApiTags("Users") @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Controller("users") export class UsersController { constructor(private readonly users: UsersService) {} @Get("sales-reps") list() { return this.users.list(); } @Post("sales-reps") create(@Body() body: CreateRepDto) { return this.users.createRep(body); } @Patch("sales-reps/:id/status") status(@Param("id") id: string, @Body() body: UpdateUserStatusDto) { return this.users.setStatus(id, Boolean(body.isActive)); } }

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@/entities/user.entity";
import { AuthModule } from "@/routes/auth/auth.module";
import { UsersController } from "@/routes/users/users.controller";
import { UsersService } from "@/routes/users/users.service";
@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

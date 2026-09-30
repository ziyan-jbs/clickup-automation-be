import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
export class CreateRepDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() requiresShopApproval?: boolean;
}
export class UpdateUserStatusDto {
  @ApiProperty() @IsBoolean() isActive: boolean;
}

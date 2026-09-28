import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
export class CreateRepDto { @ApiProperty() @IsString() name: string; @ApiProperty() @IsEmail() email: string; @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string; }
export class UpdateUserStatusDto { @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean; }

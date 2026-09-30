import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";
export class LoginDto {
  @ApiProperty({ example: "admin@demo.test" }) @IsEmail() email: string;
  @ApiProperty({ example: "your-configured-demo-password" })
  @IsString()
  @MinLength(8)
  password: string;
}

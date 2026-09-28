import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";

export class ClickUpTokenDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MaxLength(2048)
  @Matches(/^pk_\S+$/, { message: "apiToken must be a ClickUp personal API token" })
  apiToken: string;
}

import { IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from "class-validator";
export class ShopDto { @IsString() @MinLength(1) name: string; @IsOptional() @IsString() contactPerson?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() address?: string; @IsString() area: string; @IsOptional() @IsLatitude() latitude?: string; @IsOptional() @IsLongitude() longitude?: string; @IsOptional() assignedRepId?: string | null; }
export class AssignmentDto { @IsString() assignedRepId: string; }

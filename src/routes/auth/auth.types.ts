import { UserRole } from "@/entities/user.entity";
export type AuthenticatedUser = { id: string; email: string; name: string; role: UserRole; isActive: boolean };

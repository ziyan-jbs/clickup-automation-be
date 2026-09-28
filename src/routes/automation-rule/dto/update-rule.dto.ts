import { PartialType } from "@nestjs/swagger";

import { CreateRuleDto } from "@/routes/automation-rule/dto/create-rule.dto";

export class UpdateRuleDto extends PartialType(CreateRuleDto) {}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, AuthenticatedRequest } from "../auth/session.guard";
import { TemplatesService, CreateTemplateInput } from "./templates.service";

@Controller("api/templates")
@UseGuards(SessionGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const templates = await this.templatesService.listForUser(
      req.session.sub,
    );
    return { success: true, templates };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      title: string;
      description?: string;
      item_type?: string;
      duration_minutes?: number;
      default_remind_minutes?: number;
      priority?: string;
    },
  ) {
    const name = TemplatesService.normalizeName(body.name);
    if (!TemplatesService.isValidName(name)) {
      return {
        success: false,
        error: "Invalid template name",
      };
    }

    const existing = await this.templatesService.existsByName(
      req.session.sub,
      name,
    );
    if (existing) {
      return { success: false, error: "Template already exists" };
    }

    const input: CreateTemplateInput = {
      user_id: req.session.sub,
      name: body.name,
      title: body.title,
      description: body.description ?? null,
      item_type:
        (body.item_type as CreateTemplateInput["item_type"]) ?? "task",
      duration_minutes: body.duration_minutes ?? null,
      default_remind_minutes: body.default_remind_minutes ?? null,
      priority:
        (body.priority as CreateTemplateInput["priority"]) ?? "normal",
    };

    const template = await this.templatesService.create(input);
    return { success: true, template };
  }

  @Get(":name")
  async findByName(
    @Req() req: AuthenticatedRequest,
    @Param("name") name: string,
  ) {
    const template = await this.templatesService.findByName(
      req.session.sub,
      name,
    );
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    return { success: true, template };
  }

  @Delete(":name")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("name") name: string,
  ) {
    const deleted = await this.templatesService.deleteByName(
      req.session.sub,
      name,
    );
    return { success: deleted };
  }
}

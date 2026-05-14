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
import { TagsService } from "./tags.service";

@Controller("api/tags")
@UseGuards(SessionGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const tags = await this.tagsService.listForUser(req.session.sub);
    return { success: true, tags };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string },
  ) {
    const result = await this.tagsService.create(req.session.sub, body.name);
    if (!result) {
      return {
        success: false,
        error: "Invalid tag name (lowercase alphanumeric, hyphens, underscores only)",
      };
    }
    return { success: true, tag: result.tag, created: result.created };
  }

  @Delete(":name")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("name") name: string,
  ) {
    const deleted = await this.tagsService.deleteByName(
      req.session.sub,
      name,
    );
    return { success: deleted };
  }

  @Post(":scheduleId/attach")
  async attach(
    @Req() req: AuthenticatedRequest,
    @Param("scheduleId") scheduleId: string,
    @Body() body: { tags: string[] },
  ) {
    const result = await this.tagsService.attachTags(
      req.session.sub,
      parseInt(scheduleId, 10),
      body.tags ?? [],
    );
    if (!result) {
      return { success: false, error: "Schedule not found" };
    }
    return { success: true, tags: result.tags, invalid: result.invalid };
  }

  @Post(":scheduleId/detach")
  async detach(
    @Req() req: AuthenticatedRequest,
    @Param("scheduleId") scheduleId: string,
    @Body() body: { tag: string },
  ) {
    const result = await this.tagsService.detachTag(
      req.session.sub,
      parseInt(scheduleId, 10),
      body.tag,
    );
    if (!result) {
      return { success: false, error: "Schedule not found" };
    }
    return { success: true, removed: result.removed };
  }
}

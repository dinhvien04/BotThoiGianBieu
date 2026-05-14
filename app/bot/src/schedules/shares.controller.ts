import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, AuthenticatedRequest } from "../auth/session.guard";
import { SharesService } from "./shares.service";

@Controller("api/shares")
@UseGuards(SessionGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get("shared-with-me")
  async sharedWithMe(@Req() req: AuthenticatedRequest) {
    const schedules = await this.sharesService.findSchedulesSharedWith(
      req.session.sub,
    );
    return { success: true, schedules };
  }

  @Get(":scheduleId/users")
  async listSharedUsers(
    @Req() req: AuthenticatedRequest,
    @Param("scheduleId", ParseIntPipe) scheduleId: number,
  ) {
    const users = await this.sharesService.listSharedUsers(
      scheduleId,
      req.session.sub,
    );
    return { success: true, users };
  }

  @Post(":scheduleId/share")
  async share(
    @Req() req: AuthenticatedRequest,
    @Param("scheduleId", ParseIntPipe) scheduleId: number,
    @Body() body: { target_user_id: string },
  ) {
    const result = await this.sharesService.share(
      scheduleId,
      req.session.sub,
      body.target_user_id,
    );
    if (!result) {
      return { success: false, error: "Schedule not found or invalid target" };
    }
    return { success: true, added: result.added, sharedWith: result.sharedWith };
  }

  @Delete(":scheduleId/unshare/:targetUserId")
  async unshare(
    @Req() req: AuthenticatedRequest,
    @Param("scheduleId", ParseIntPipe) scheduleId: number,
    @Param("targetUserId") targetUserId: string,
  ) {
    const result = await this.sharesService.unshare(
      scheduleId,
      req.session.sub,
      targetUserId,
    );
    if (!result) {
      return { success: false, error: "Schedule not found" };
    }
    return { success: true, removed: result.removed };
  }
}

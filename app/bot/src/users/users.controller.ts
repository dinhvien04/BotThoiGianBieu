import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, AuthenticatedRequest } from "../auth/session.guard";
import { UsersService, UpdateSettingsPatch } from "./users.service";

@Controller("api/user")
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  async getProfile(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.findByUserId(req.session.sub);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    return {
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        display_name: user.display_name,
      },
      settings: user.settings,
    };
  }

  @Patch("settings")
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      timezone?: string;
      default_remind_minutes?: number;
      notify_via_dm?: boolean;
      notify_via_channel?: boolean;
      work_start_hour?: number;
      work_end_hour?: number;
    },
  ) {
    const patch: UpdateSettingsPatch = {};
    if (body.timezone !== undefined) patch.timezone = body.timezone;
    if (body.default_remind_minutes !== undefined)
      patch.default_remind_minutes = body.default_remind_minutes;
    if (body.notify_via_dm !== undefined)
      patch.notify_via_dm = body.notify_via_dm;
    if (body.notify_via_channel !== undefined)
      patch.notify_via_channel = body.notify_via_channel;
    if (body.work_start_hour !== undefined)
      patch.work_start_hour = body.work_start_hour;
    if (body.work_end_hour !== undefined)
      patch.work_end_hour = body.work_end_hour;

    const settings = await this.usersService.updateSettings(
      req.session.sub,
      patch,
    );
    return { success: true, settings };
  }
}

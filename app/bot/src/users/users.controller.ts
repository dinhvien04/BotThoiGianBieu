import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, AuthenticatedRequest } from "../auth/session.guard";
import { UsersService, UpdateProfilePatch, UpdateSettingsPatch } from "./users.service";

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
        email: user.email,
        phone: user.phone,
        job_title: user.job_title,
        bio: user.bio,
        role: user.role,
        is_locked: user.is_locked,
      },
      settings: user.settings,
    };
  }

  @Patch("profile")
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: UpdateProfilePatch,
  ) {
    const patch: UpdateProfilePatch = {};
    if (body.display_name !== undefined) patch.display_name = body.display_name;
    if (body.email !== undefined) patch.email = body.email;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.job_title !== undefined) patch.job_title = body.job_title;
    if (body.bio !== undefined) patch.bio = body.bio;

    const user = await this.usersService.updateProfile(req.session.sub, patch);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        phone: user.phone,
        job_title: user.job_title,
        bio: user.bio,
        role: user.role,
        is_locked: user.is_locked,
      },
    };
  }

  @Patch("settings")
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      timezone?: string;
      language?: "vi" | "en";
      default_remind_minutes?: number;
      notify_via_dm?: boolean;
      notify_via_channel?: boolean;
      work_start_hour?: number;
      work_end_hour?: number;
    },
  ) {
    const patch: UpdateSettingsPatch = {};
    if (body.timezone !== undefined) patch.timezone = body.timezone;
    if (body.language !== undefined) patch.language = body.language;
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

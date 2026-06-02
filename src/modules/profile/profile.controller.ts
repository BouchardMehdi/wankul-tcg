import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: { id: number }) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('avatar')
  updateAvatar(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateAvatarDto,
  ) {
    return this.profileService.updateAvatar(user.id, dto);
  }

  @Post('badges/sync')
  async syncBadges(@CurrentUser() user: { id: number }) {
    const newlyUnlocked = await this.profileService.evaluateAndGrantBadges(user.id);
    return { newlyUnlocked };
  }
}

import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('signup')
export class ManualSignupController {
  constructor(private readonly authService: AuthService) {}

  @Post('manual')
  @HttpCode(HttpStatus.OK)
  manualSignup(
    @Body()
    dto: {
      name: string;
      email?: string;
      phone?: string;
      city: string;
      vehicleType: string;
      platformId?: string;
    },
    @Headers('x-onboarding-token') onboardingToken?: string,
  ) {
    return this.authService.signupManual(dto, onboardingToken);
  }
}

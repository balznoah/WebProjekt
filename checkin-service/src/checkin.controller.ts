// checkin.controller.ts - QR Check-in am Eingang (aus der Aufgabe)
import {
  Controller, Post, Get, Body, UseGuards, Req,
  Query, ForbiddenException
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { AuthGuard } from './auth.guard';

@Controller('checkin')
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  // POST /checkin - QR-Code scannen und einlassen (nur Staff/Admin)
  @Post()
  @UseGuards(AuthGuard)
  async checkin(@Body() dto: { qrCode: string }, @Req() req: any) {
    if (!['admin', 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Nur Staff/Admin darf einchecken');
    }
    return this.checkinService.validateAndCheckin(dto.qrCode, req.user.sub);
  }

  // GET /checkin - Check-in Historie (Staff/Admin)
  @Get()
  @UseGuards(AuthGuard)
  getCheckins(@Query('eventId') eventId: string, @Req() req: any) {
    if (!['admin', 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Nur Staff/Admin');
    }
    return this.checkinService.getCheckins(eventId ? parseInt(eventId) : undefined);
  }

  // GET /checkin/stats - Einlass-Statistiken
  @Get('stats')
  @UseGuards(AuthGuard)
  getStats(@Req() req: any) {
    if (!['admin', 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Nur Staff/Admin');
    }
    return this.checkinService.getStats();
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'checkin-service' };
  }
}

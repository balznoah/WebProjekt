// event.controller.ts - REST API für Events (aus VL4: NestJS Controller)
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards, Req, ParseIntPipe,
  HttpCode, HttpStatus, ForbiddenException
} from '@nestjs/common';
import { EventService } from './event.service';
import { AuthGuard } from './auth.guard';

@Controller('events')
export class EventController {
  constructor(private eventService: EventService) {}

  // GET /events - Alle Events (öffentlich)
  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  // GET /events/:id - Einzelnes Event
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.findOne(id);
  }

  // POST /events - Event erstellen (nur Admin)
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: any, @Req() req: any) {
    // Nur Admin darf Events erstellen (aus VL4: Autorisierung)
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Nur Admins dürfen Events erstellen');
    }
    return this.eventService.create(dto);
  }

  // PUT /events/:id - Event aktualisieren (nur Admin)
  @Put(':id')
  @UseGuards(AuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Nur Admins dürfen Events bearbeiten');
    }
    return this.eventService.update(id, dto);
  }

  // DELETE /events/:id - Event löschen (nur Admin)
  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Nur Admins dürfen Events löschen');
    }
    return this.eventService.delete(id);
  }

  // POST /events/:id/reserve - Plätze reservieren (intern, Order Service)
  @Post(':id/reserve')
  reserveSeats(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { category: string; count: number },
  ) {
    const totalPrice = this.eventService.reserveSeats(id, dto.category, dto.count);
    return { success: true, totalPrice };
  }

  // POST /events/:id/release - Plätze freigeben
  @Post(':id/release')
  releaseSeats(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { category: string; count: number },
  ) {
    this.eventService.releaseSeats(id, dto.category, dto.count);
    return { success: true };
  }

  // GET /events/health
  @Get('health/check')
  health() {
    return { status: 'ok', service: 'event-service' };
  }
}

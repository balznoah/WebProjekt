// event.service.ts - Event/Catalog Service (Events, Plätze, Preise)
// Service (aus VL4: NestJS Services)
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

export interface SeatCategory {
  name: string;       // z.B. "VIP", "Standard", "Economy"
  price: number;      // Preis in Euro
  total: number;      // Gesamtkontingent
  available: number;  // Verfügbare Plätze
}

export interface Event {
  id: number;
  name: string;
  description: string;
  location: string;
  date: string;          // ISO-Datum
  categories: SeatCategory[];
  createdAt: string;
}

@Injectable()
export class EventService {
  // In-Memory Store (aus VL4: Map als Datenspeicher)
  private events: Map<number, Event> = new Map();
  private nextId = 1;

  constructor() {
    this.seedEvents();
  }

  private seedEvents() {
    this.create({
      name: 'DHBW Tech-Konferenz 2026',
      description: 'Jahreskonferenz für Informatik-Studierende',
      location: 'DHBW Karlsruhe, Aula',
      date: '2026-06-15T09:00:00Z',
      categories: [
        { name: 'VIP', price: 49.99, total: 50, available: 50 },
        { name: 'Standard', price: 19.99, total: 200, available: 200 },
        { name: 'Economy', price: 9.99, total: 500, available: 500 },
      ],
    });
    this.create({
      name: 'Microservices Workshop',
      description: 'Hands-on Workshop mit NestJS, Kafka und Kubernetes',
      location: 'DHBW Karlsruhe, Raum B201',
      date: '2026-07-01T14:00:00Z',
      categories: [
        { name: 'Standard', price: 0, total: 30, available: 30 },
      ],
    });
    this.create({
      name: 'Angular & React Meetup',
      description: 'Community-Treffen für Frontend-Entwickler',
      location: 'DHBW Karlsruhe, Cafeteria',
      date: '2026-07-20T18:00:00Z',
      categories: [
        { name: 'Standard', price: 5.00, total: 100, available: 100 },
      ],
    });
  }

  create(dto: Omit<Event, 'id' | 'createdAt'>): Event {
    const event: Event = {
      id: this.nextId++,
      ...dto,
      createdAt: new Date().toISOString(),
    };
    this.events.set(event.id, event);
    return event;
  }

  findAll(): Event[] {
    return Array.from(this.events.values());
  }

  findOne(id: number): Event {
    const event = this.events.get(id);
    if (!event) throw new NotFoundException(`Event ${id} nicht gefunden`);
    return event;
  }

  update(id: number, dto: Partial<Omit<Event, 'id' | 'createdAt'>>): Event {
    const event = this.findOne(id);
    const updated = { ...event, ...dto };
    this.events.set(id, updated);
    return updated;
  }

  delete(id: number): void {
    if (!this.events.has(id)) throw new NotFoundException(`Event ${id} nicht gefunden`);
    this.events.delete(id);
  }

  // Sitzplatzkontingent reservieren (wird vom Order Service genutzt)
  reserveSeats(eventId: number, categoryName: string, count: number): number {
    const event = this.findOne(eventId);
    const cat = event.categories.find(c => c.name === categoryName);
    if (!cat) throw new NotFoundException(`Kategorie ${categoryName} nicht gefunden`);
    if (cat.available < count) throw new BadRequestException(`Nur noch ${cat.available} Plätze verfügbar`);
    cat.available -= count;
    this.events.set(eventId, event);
    return cat.price * count;
  }

  // Sitzplätze freigeben (bei Storno)
  releaseSeats(eventId: number, categoryName: string, count: number): void {
    const event = this.events.get(eventId);
    if (!event) return;
    const cat = event.categories.find(c => c.name === categoryName);
    if (cat) {
      cat.available = Math.min(cat.total, cat.available + count);
      this.events.set(eventId, event);
    }
  }
}

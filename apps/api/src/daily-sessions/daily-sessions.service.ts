import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DefaultLocationService } from '../common/default-location.service';
import { OpenSessionDto } from './dto/open-session.dto';

const sessionInclude = {
  location: true,
  openedBy: { select: { id: true, fullName: true, role: true } },
  closedBy: { select: { id: true, fullName: true, role: true } },
} as const;

@Injectable()
export class DailySessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultLocation: DefaultLocationService,
  ) {}

  async open(_dto: OpenSessionDto, openedById: string) {
    const locationId = await this.defaultLocation.getDefaultLocationId();
    const existing = await this.prisma.dailySession.findFirst({
      where: { locationId, status: 'OPEN' },
    });
    if (existing) {
      throw new BadRequestException('A session is already open');
    }

    return this.prisma.dailySession.create({
      data: { locationId, openedById },
      include: sessionInclude,
    });
  }

  async close(id: string, closedById: string) {
    const session = await this.prisma.dailySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'CLOSED') {
      throw new BadRequestException('Session is already closed');
    }

    return this.prisma.dailySession.update({
      where: { id },
      data: { status: 'CLOSED', closedById, closedAt: new Date() },
      include: sessionInclude,
    });
  }

  findAll(params: { status?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    return this.prisma.dailySession.findMany({
      where,
      include: sessionInclude,
      orderBy: { openedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.dailySession.findUnique({
      where: { id },
      include: sessionInclude,
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}

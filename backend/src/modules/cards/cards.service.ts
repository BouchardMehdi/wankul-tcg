import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Card } from './card.entity';
import { ListCardsQueryDto } from './dto/list-cards.query';
import { normalizeCardKey } from './cards.util';

@Injectable()
export class CardsService {
  constructor(@InjectRepository(Card) private readonly repo: Repository<Card>) {}

  async list(query: ListCardsQueryDto) {
    const page = query.page ?? 1;

    const limitRaw = query.limit ?? 50;
    const limit = Math.max(1, Math.min(2000, limitRaw));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.seasonNumber !== undefined) where.seasonNumber = query.seasonNumber;
    if (query.rarity) where.rarity = query.rarity;
    if (query.type) where.type = query.type;
    if (query.gameplayType) where.gameplayType = query.gameplayType;

    if (query.specialEdition !== undefined) {
      if (query.specialEdition === 'true') where.specialEdition = true;
      if (query.specialEdition === 'false') where.specialEdition = false;
    }

    let whereOr: any = where;
    if (query.q && query.q.trim().length) {
      const q = `%${query.q.trim()}%`;
      whereOr = [
        { ...where, name: Like(q) },
        { ...where, key: Like(q) },
        { ...where, artist: Like(q) },
      ];
    }

    const [items, total] = await this.repo.findAndCount({
      where: whereOr,
      order: { [query.sort ?? 'seasonNumber']: query.order ?? 'ASC', number: 'ASC' },
      skip,
      take: limit,
    });

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }

  async findByIdOrFail(id: number) {
    const card = await this.repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }

  async findByKeyOrFail(input: string) {
    const key = normalizeCardKey(input);

    const card = await this.repo.findOne({ where: { key } });
    if (!card) throw new NotFoundException('Card not found');

    return card;
  }

  async getByKey(key: string) {
    const k = key.trim();

    const card = await this.repo.findOne({ where: { key: k } });
    if (card) return card;

    return this.repo
      .createQueryBuilder('c')
      .where('LOWER(c.key) = LOWER(:k)', { k })
      .getOne();
  }

  async meta() {
    const [seasons, rarities, types, gameplayTypes] = await Promise.all([
      this.repo
        .createQueryBuilder('c')
        .select('DISTINCT c.seasonNumber', 'seasonNumber')
        .where('c.seasonNumber IS NOT NULL')
        .orderBy('c.seasonNumber', 'ASC')
        .getRawMany(),
      this.repo
        .createQueryBuilder('c')
        .select('DISTINCT c.rarity', 'rarity')
        .where('c.rarity IS NOT NULL')
        .orderBy('c.rarity', 'ASC')
        .getRawMany(),
      this.repo
        .createQueryBuilder('c')
        .select('DISTINCT c.type', 'type')
        .where('c.type IS NOT NULL')
        .orderBy('c.type', 'ASC')
        .getRawMany(),
      this.repo
        .createQueryBuilder('c')
        .select('DISTINCT c.gameplayType', 'gameplayType')
        .where('c.gameplayType IS NOT NULL')
        .orderBy('c.gameplayType', 'ASC')
        .getRawMany(),
    ]);

    return {
      seasonNumbers: seasons.map((x) => Number(x.seasonNumber)).filter((n) => Number.isFinite(n)),
      rarities: rarities.map((x) => x.rarity).filter(Boolean),
      types: types.map((x) => x.type).filter(Boolean),
      gameplayTypes: gameplayTypes.map((x) => x.gameplayType).filter(Boolean),
    };
  }
}

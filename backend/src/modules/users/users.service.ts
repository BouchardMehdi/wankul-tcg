import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserCard } from './user-card.entity';
import { EconomyService } from '../economy/economy.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserCard) private readonly userCardsRepo: Repository<UserCard>,
    private readonly dataSource: DataSource,
    private readonly economy: EconomyService,
  ) {}

  async findByIdOrFail(id: number) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsername(username: string) {
    return this.usersRepo.findOne({ where: { username } });
  }

  async findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async createUser(data: Partial<User>) {
    const user = this.usersRepo.create(data);
    const saved = await this.usersRepo.save(user);

    // crée aussi la ligne économie
    await this.economy.ensure(saved.id);

    return saved;
  }

  /**
   * Retourne la quantité possédée AVANT ouverture pour une liste de cardIds
   */
  async getOwnedMap(userId: number, cardIds: number[]) {
    const unique = Array.from(new Set(cardIds));
    if (!unique.length) return new Map<number, number>();

    const rows = await this.userCardsRepo.find({
      where: {
        user: { id: userId } as any,
        card: { id: In(unique) } as any,
      } as any,
      relations: ['card'],
    });

    const map = new Map<number, number>();
    for (const r of rows) map.set(r.card.id, r.quantity);

    return map;
  }

  /**
   * BULK UPSERT ultra rapide
   */
  async addCardsToUserBulk(userId: number, cardIds: number[], manager?: EntityManager) {
    if (!cardIds.length) return;

    const map = new Map<number, number>();
    for (const id of cardIds) map.set(id, (map.get(id) ?? 0) + 1);

    // ⚠️ IMPORTANT :
    // ton schéma MySQL actuel utilise des colonnes camelCase (userId, cardId) (tu as eu l’erreur sur user_id),
    // donc on insère avec userId/cardId.
    const rows = Array.from(map.entries()).map(([cardId, qty]) => ({
      userId: userId,
      cardId: cardId,
      quantity: qty,
    }));

    const em = manager ?? this.dataSource.manager;

    const valuesSql = rows.map(() => '(?, ?, ?)').join(',');
    const params = rows.flatMap((r) => [r.userId, r.cardId, r.quantity]);

    await em.query(
      `
      INSERT INTO user_cards (userId, cardId, quantity)
      VALUES ${valuesSql}
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
      `,
      params,
    );
  }

  async addCardToUser(userId: number, cardId: number, quantity = 1) {
    const ids: number[] = [];
    for (let i = 0; i < quantity; i++) ids.push(cardId);
    await this.addCardsToUserBulk(userId, ids);
    return { ok: true };
  }

  async getCollection(userId: number) {
    const rows = await this.userCardsRepo.find({
      where: { user: { id: userId } as any },
      relations: ['card'],
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      card: r.card,
      quantity: r.quantity,
    }));
  }
}

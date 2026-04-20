import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Card } from '../cards/card.entity';

@Entity('push_watchlist')
@Index(['user', 'card'], { unique: true })
export class PushWatchlistEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card!: Card;

  @Column({ name: 'target_price_credits', type: 'int' })
  targetPriceCredits!: number;

  @Column({ name: 'target_reached_notified', type: 'tinyint', default: 0 })
  targetReachedNotified!: boolean;

  @Column({ name: 'last_triggered_at', type: 'datetime', nullable: true })
  lastTriggeredAt!: Date | null;

  @Column({ name: 'last_triggered_price', type: 'int', nullable: true })
  lastTriggeredPrice!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}

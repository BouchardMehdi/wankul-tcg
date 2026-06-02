import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from '../cards/card.entity';

@Entity('market_price_history')
@Index('idx_market_price_history_card_recorded_at', ['cardId', 'recordedAt'])
export class MarketPriceHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'card_id', type: 'int' })
  cardId!: number;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card!: Card;

  @Column({ type: 'int' })
  price!: number;

  @Column({
    name: 'source_label',
    type: 'varchar',
    length: 40,
    default: 'market_snapshot',
  })
  sourceLabel!: string;

  @Column({ name: 'recorded_at', type: 'datetime' })
  recordedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}
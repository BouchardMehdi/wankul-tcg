import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Card } from '../cards/card.entity';

@Entity('user_cards')
@Index(['user', 'card'], { unique: true })
export class UserCard {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card!: Card;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ name: 'quantity_locked', type: 'int', default: 0 })
  quantityLocked!: number;
}
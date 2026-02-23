import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Card } from '../cards/card.entity';

@Entity('user_cards')
@Index(['user', 'card'], { unique: true })
export class UserCard {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // ✅ force colonne
  user!: User;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' }) // ✅ force colonne
  card!: Card;

  @Column({ type: 'int', default: 0 })
  quantity!: number;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('user_badges')
@Index(['userId', 'badgeCode'], { unique: true })
export class UserBadge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'badge_code', type: 'varchar', length: 80 })
  badgeCode!: string;

  @Column({ name: 'reward_credits', type: 'int', default: 0 })
  rewardCredits!: number;

  @Column({ name: 'reward_free_boosters', type: 'int', default: 0 })
  rewardFreeBoosters!: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt!: Date;
}

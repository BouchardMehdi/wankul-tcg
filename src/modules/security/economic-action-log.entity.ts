import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EconomicActionStatus = 'allowed' | 'flagged' | 'blocked';
export type EconomicActionSeverity = 'info' | 'watch' | 'danger';

@Entity('economic_action_logs')
@Index(['createdAt'])
@Index(['action', 'status'])
@Index(['userId', 'action', 'createdAt'])
@Index(['cardId', 'createdAt'])
@Index(['relatedUserId', 'createdAt'])
export class EconomicActionLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({ name: 'related_user_id', type: 'int', nullable: true })
  relatedUserId!: number | null;

  @Column({ name: 'card_id', type: 'int', nullable: true })
  cardId!: number | null;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 16, default: 'allowed' })
  status!: EconomicActionStatus;

  @Column({ type: 'varchar', length: 16, default: 'info' })
  severity!: EconomicActionSeverity;

  @Column({ name: 'target_type', type: 'varchar', length: 40, nullable: true })
  targetType!: string | null;

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId!: number | null;

  @Column({ name: 'value_credits', type: 'int', default: 0 })
  valueCredits!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}

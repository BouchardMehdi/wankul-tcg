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

@Entity('push_subscriptions')
@Index(['endpointHash'], { unique: true })
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 1000 })
  endpoint!: string;

  @Column({ name: 'endpoint_hash', type: 'char', length: 64 })
  endpointHash!: string;

  @Column({ name: 'p256dh_key', type: 'varchar', length: 255 })
  p256dhKey!: string;

  @Column({ name: 'auth_key', type: 'varchar', length: 255 })
  authKey!: string;

  @Column({ name: 'expiration_time', type: 'varchar', length: 32, nullable: true })
  expirationTime!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'last_successful_push_at', type: 'datetime', nullable: true })
  lastSuccessfulPushAt!: Date | null;

  @Column({ name: 'last_failure_at', type: 'datetime', nullable: true })
  lastFailureAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}

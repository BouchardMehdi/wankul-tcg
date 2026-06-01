import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('push_delivery_logs')
@Index(['createdAt'])
@Index(['kind'])
@Index(['status'])
@Index(['userId'])
export class PushDeliveryLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({ name: 'subscription_id', type: 'int', nullable: true })
  subscriptionId!: number | null;

  @Column({ name: 'endpoint_hash', type: 'char', length: 64, nullable: true })
  endpointHash!: string | null;

  @Column({ type: 'varchar', length: 80 })
  kind!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  tag!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: 'sent' | 'failed';

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}

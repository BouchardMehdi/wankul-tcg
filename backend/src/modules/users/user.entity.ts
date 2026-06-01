import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'player' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 40 })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  emailVerificationCodeHash!: string | null;

  @Column({ type: 'datetime', nullable: true })
  emailVerificationExpiresAt!: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  passwordResetCodeHash!: string | null;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpiresAt!: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'player' })
  role!: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  adminPasswordHash!: string | null;

  @Column({ name: 'suspended_until', type: 'datetime', nullable: true })
  suspendedUntil!: Date | null;

  @Column({ name: 'suspension_reason', type: 'varchar', length: 255, nullable: true })
  suspensionReason!: string | null;

  @Column({ name: 'market_blocked_until', type: 'datetime', nullable: true })
  marketBlockedUntil!: Date | null;

  @Column({ name: 'market_block_reason', type: 'varchar', length: 255, nullable: true })
  marketBlockReason!: string | null;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
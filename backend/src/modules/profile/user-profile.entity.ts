import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 500,
    default: '/avatars/default-laink.svg',
  })
  avatarUrl!: string;

  @Column({
    name: 'avatar_source',
    type: 'varchar',
    length: 40,
    default: 'default-laink',
  })
  avatarSource!: string;

  @Column({ name: 'featured_badge_code', type: 'varchar', length: 80, nullable: true })
  featuredBadgeCode!: string | null;

  @Column({ type: 'varchar', length: 140, nullable: true })
  bio!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

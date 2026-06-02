import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('display_openings')
export class DisplayOpening {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  openedAt!: Date;

  @Column({ type: 'int', nullable: true })
  seasonNumber!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  season!: string | null;

  @Column({ type: 'int', default: 24 })
  boosterCount!: number;

  @Column({ type: 'json' })
  resultJson!: any;
}
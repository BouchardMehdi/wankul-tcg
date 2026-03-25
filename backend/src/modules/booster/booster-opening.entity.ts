import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('booster_openings')
export class BoosterOpening {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  openedAt!: Date;

  @Column({ type: 'int', nullable: true })
  seasonNumber!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  seasonLabel!: string | null;

  @Column({ type: 'json' })
  cardIds!: number[];

  @Column({ type: 'int', default: 1 })
  boosterCount!: number;

  @Column({ type: 'json', nullable: true })
  resultJson!: any;
}
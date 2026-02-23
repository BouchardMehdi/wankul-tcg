import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('display_openings')
export class DisplayOpening {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  openedAt!: Date;

  @Column({ type: 'varchar', length: 20 })
  season!: string;

  @Column({ type: 'int', default: 24 })
  boosterCount!: number;

  // On stocke seulement des IDs (compact)
  // format: { boosters: number[][], goldIndex: number|null, legendaryIndex: number, legendary: { rarity, cardId } }
  @Column({ type: 'json' })
  resultJson!: any;
}

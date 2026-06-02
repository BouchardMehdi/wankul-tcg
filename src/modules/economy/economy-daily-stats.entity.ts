import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('economy_daily_stats')
export class EconomyDailyStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ default: 0 })
  boostersOpened: number;

  @Column({ default: 0 })
  displaysOpened: number;

  @Column({ default: 0 })
  creditsSpent: number;

  @Column({ default: 0 })
  creditsEarnedOpening: number;

  @Column({ default: 0 })
  creditsEarnedQuickSell: number;

  @Column({ default: 0 })
  creditsEarnedJackpot: number;

  @Column({ default: 0 })
  marketVolume: number;

  @CreateDateColumn()
  createdAt: Date;
}
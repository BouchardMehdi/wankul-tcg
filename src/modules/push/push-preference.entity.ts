import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('push_notification_preferences')
@Index(['user'], { unique: true })
export class PushNotificationPreferenceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'sale_reward_enabled', type: 'tinyint', default: 1 })
  saleRewardEnabled!: boolean;

  @Column({ name: 'free_openings_ready_enabled', type: 'tinyint', default: 1 })
  freeOpeningsReadyEnabled!: boolean;

  @Column({ name: 'free_openings_soon_enabled', type: 'tinyint', default: 1 })
  freeOpeningsSoonEnabled!: boolean;

  @Column({ name: 'free_openings_soon_minutes', type: 'int', default: 15 })
  freeOpeningsSoonMinutes!: number;

  @Column({ name: 'watchlist_price_alert_enabled', type: 'tinyint', default: 1 })
  watchlistPriceAlertEnabled!: boolean;

  @Column({ name: 'stale_listing_alert_enabled', type: 'tinyint', default: 1 })
  staleListingAlertEnabled!: boolean;

  @Column({ name: 'stale_listing_hours', type: 'int', default: 24 })
  staleListingHours!: number;

  @Column({ name: 'daily_market_recap_enabled', type: 'tinyint', default: 0 })
  dailyMarketRecapEnabled!: boolean;

  @Column({ name: 'last_daily_market_recap_sent_at', type: 'datetime', nullable: true })
  lastDailyMarketRecapSentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}

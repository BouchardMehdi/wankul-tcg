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
import { Card } from '../cards/card.entity';
import { MarketListingStatus } from './market-listing-status.enum';
import { MarketListingMode } from './market-listing-mode.enum';
import { MarketOfferType } from './market-offer-type.enum';

@Entity('market_listings')
@Index(['status'])
export class MarketListing {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card!: Card;

  @Column({
    name: 'listing_mode',
    type: 'varchar',
    length: 20,
    default: MarketListingMode.UNIT,
  })
  listingMode!: MarketListingMode;

  @Column({
    name: 'offer_type',
    type: 'varchar',
    length: 30,
    default: MarketOfferType.CREDITS_ONLY,
  })
  offerType!: MarketOfferType;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'remaining_quantity', type: 'int' })
  remainingQuantity!: number;

  /**
   * UNIT:
   * - prix demandé par unité
   *
   * LOT:
   * - prix demandé pour le lot entier
   */
  @Column({ name: 'price_credits', type: 'int' })
  priceCredits!: number;

  @ManyToOne(() => Card, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'wanted_card_id' })
  wantedCard!: Card | null;

  /**
   * UNIT:
   * - quantité de wantedCard demandée par unité
   *
   * LOT:
   * - quantité totale de wantedCard demandée pour le lot entier
   */
  @Column({ name: 'wanted_card_quantity', type: 'int', default: 0 })
  wantedCardQuantity!: number;

  @Column({
    name: 'wanted_card_market_price_snapshot',
    type: 'int',
    default: 0,
  })
  wantedCardMarketPriceSnapshot!: number;

  @Column({ name: 'market_price_snapshot', type: 'int' })
  marketPriceSnapshot!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: MarketListingStatus.ACTIVE,
  })
  status!: MarketListingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt!: Date | null;
}
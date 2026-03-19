import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Card } from '../cards/card.entity';
import { MarketListing } from './market-listing.entity';
import { MarketTransactionType } from './market-transaction-type.enum';
import { MarketListingMode } from './market-listing-mode.enum';
import { MarketOfferType } from './market-offer-type.enum';

@Entity('market_transactions')
export class MarketTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => MarketListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: MarketListing;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer!: User;

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

  @Column({ name: 'unit_price_credits', type: 'int' })
  unitPriceCredits!: number;

  @Column({ name: 'total_price_credits', type: 'int' })
  totalPriceCredits!: number;

  @ManyToOne(() => Card, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyer_offered_card_id' })
  buyerOfferedCard!: Card | null;

  @Column({ name: 'buyer_offered_card_quantity', type: 'int', default: 0 })
  buyerOfferedCardQuantity!: number;

  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 30,
    default: MarketTransactionType.CREDITS_SALE,
  })
  transactionType!: MarketTransactionType;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}
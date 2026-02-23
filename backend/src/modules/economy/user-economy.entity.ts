import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('user_economy')
export class UserEconomy {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', default: 0 })
  credits!: number;

  // ✅ bonus de départ donné après email vérifié
  @Column({ name: 'signup_bonus_granted', type: 'tinyint', default: 0 })
  signupBonusGranted!: number;

  // Charges gratuites
  @Column({ name: 'free_booster_charges', type: 'tinyint', default: 4 })
  freeBoosterCharges!: number;

  @Column({ name: 'free_display_charges', type: 'tinyint', default: 1 })
  freeDisplayCharges!: number;

  // Dernier recalcul des charges
  @Column({ name: 'booster_recharge_at', type: 'datetime', nullable: true })
  boosterRechargeAt!: Date | null;

  @Column({ name: 'display_recharge_at', type: 'datetime', nullable: true })
  displayRechargeAt!: Date | null;
}

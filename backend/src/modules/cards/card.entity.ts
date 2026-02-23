import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  season: string | null;

  @Column({ type: 'int', nullable: true })
  seasonNumber: number | null;

  // ✅ NOUVEAU : indispensable pour Gagnant ticket d'or
  // car ces cartes ont season=null mais extension=Battle/Stellar/...
  @Column({ type: 'varchar', length: 50, nullable: true })
  extension: string | null;

  @Column({ type: 'int', nullable: true })
  number: number | null;

  @Column()
  rarity: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  type!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  gameplayType!: string | null;

  @Column({ default: false })
  specialEdition: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  artist: string | null;

  @Column()
  imageUrl: string;
}

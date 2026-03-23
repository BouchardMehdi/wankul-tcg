import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { BugReportStatusHistory } from './bug-report-status-history.entity';

export type BugReportStatus =
  | 'open'
  | 'investigating'
  | 'planned'
  | 'fixed'
  | 'closed'
  | 'rejected';

@Entity('bug_reports')
export class BugReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ length: 40 })
  usernameSnapshot!: string;

  @Column()
  emailSnapshot!: string;

  @Column({ length: 24 })
  category!: string;

  @Column({ length: 60 })
  page!: string;

  @Column({ length: 80 })
  feature!: string;

  @Column({ length: 24 })
  priority!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  reproductionSteps!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  currentUrl!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  browserInfo!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  screenshotUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: BugReportStatus;

  @Column({ type: 'text', nullable: true })
  resolutionNote!: string | null;

  @Column({ type: 'datetime', nullable: true })
  treatedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  fixedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => BugReportStatusHistory, (history) => history.report, {
    cascade: false,
  })
  histories!: BugReportStatusHistory[];
}
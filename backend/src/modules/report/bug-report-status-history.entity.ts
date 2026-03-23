import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BugReport } from './bug-report.entity';

@Entity('bug_report_status_history')
export class BugReportStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => BugReport, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report!: BugReport;

  @Column()
  reportId!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 20 })
  toStatus!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 80, default: 'system' })
  changedBy!: string;

  @CreateDateColumn()
  changedAt!: Date;
}
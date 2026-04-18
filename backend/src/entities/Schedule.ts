import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { TeradataConnection } from './TeradataConnection';
import { ExecutionLog } from './ExecutionLog';

@Entity({ name: 'schedules' })
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'connection_id', type: 'uuid' })
  connectionId!: string;

  @ManyToOne(() => TeradataConnection, (connection) => connection.schedules, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'connection_id' })
  connection!: TeradataConnection;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'cron_expression', type: 'varchar', length: 50 })
  cronExpression!: string;

  @Column({ name: 'panel_ids', type: 'uuid', array: true })
  panelIds!: string[];

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt!: Date | null;

  @Column({ name: 'last_run_status', type: 'varchar', length: 20, nullable: true })
  lastRunStatus!: 'success' | 'error' | 'running' | null;

  @Column({ name: 'last_run_duration_ms', type: 'integer', nullable: true })
  lastRunDurationMs!: number | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ExecutionLog, (executionLog) => executionLog.schedule)
  executionLogs!: ExecutionLog[];
}

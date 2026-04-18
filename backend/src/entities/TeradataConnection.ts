import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ReportPanel } from './ReportPanel';
import { Schedule } from './Schedule';
import { ExecutionLog } from './ExecutionLog';

@Entity({ name: 'teradata_connections' })
export class TeradataConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  host!: string;

  @Column({ type: 'integer', default: 1025 })
  port!: number;

  @Column({ type: 'varchar', length: 100 })
  username!: string;

  @Column({ type: 'text' })
  password!: string;

  @Column({ name: 'database_name', type: 'varchar', length: 100, nullable: true })
  databaseName!: string | null;

  @Column({ name: 'jdbc_params', type: 'jsonb', default: () => "'{}'::jsonb" })
  jdbcParams!: Record<string, unknown>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_test_at', type: 'timestamptz', nullable: true })
  lastTestAt!: Date | null;

  @Column({ name: 'last_test_success', type: 'boolean', nullable: true })
  lastTestSuccess!: boolean | null;

  @Column({ name: 'last_test_message', type: 'text', nullable: true })
  lastTestMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ReportPanel, (panel) => panel.connection)
  reportPanels!: ReportPanel[];

  @OneToMany(() => Schedule, (schedule) => schedule.connection)
  schedules!: Schedule[];

  @OneToMany(() => ExecutionLog, (executionLog) => executionLog.connection)
  executionLogs!: ExecutionLog[];
}

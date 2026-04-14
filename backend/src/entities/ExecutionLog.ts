import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Schedule } from './Schedule';
import { ReportPanel } from './ReportPanel';
import { TeradataConnection } from './TeradataConnection';

@Entity({ name: 'execution_log' })
export class ExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId!: string | null;

  @ManyToOne(() => Schedule, (schedule) => schedule.executionLogs, {
    onDelete: 'SET NULL',
    nullable: true
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: Schedule | null;

  @Column({ name: 'panel_id', type: 'uuid', nullable: true })
  panelId!: string | null;

  @ManyToOne(() => ReportPanel, (panel) => panel.executionLogs, {
    onDelete: 'SET NULL',
    nullable: true
  })
  @JoinColumn({ name: 'panel_id' })
  panel!: ReportPanel | null;

  @Column({ name: 'connection_id', type: 'uuid', nullable: true })
  connectionId!: string | null;

  @ManyToOne(() => TeradataConnection, (connection) => connection.executionLogs, {
    onDelete: 'SET NULL',
    nullable: true
  })
  @JoinColumn({ name: 'connection_id' })
  connection!: TeradataConnection | null;

  @Column({ type: 'varchar', length: 20 })
  status!: 'success' | 'error';

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs!: number | null;

  @Column({ name: 'row_count', type: 'integer', nullable: true })
  rowCount!: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'executed_at', type: 'timestamptz', default: () => 'NOW()' })
  executedAt!: Date;
}

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
import { PanelDataCache } from './PanelDataCache';
import { ExecutionLog } from './ExecutionLog';

@Entity({ name: 'report_panels' })
export class ReportPanel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'connection_id', type: 'uuid' })
  connectionId!: string;

  @ManyToOne(() => TeradataConnection, (connection) => connection.reportPanels, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'connection_id' })
  connection!: TeradataConnection;

  @Column({ name: 'panel_key', type: 'varchar', length: 50, unique: true })
  panelKey!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'sql_query', type: 'text' })
  sqlQuery!: string;

  @Column({ name: 'field_mappings', type: 'jsonb' })
  fieldMappings!: Record<string, unknown>;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'execution_order', type: 'integer', default: 0 })
  executionOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PanelDataCache, (panelCache) => panelCache.panel)
  cacheEntries!: PanelDataCache[];

  @OneToMany(() => ExecutionLog, (executionLog) => executionLog.panel)
  executionLogs!: ExecutionLog[];
}

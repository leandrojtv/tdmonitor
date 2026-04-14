import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ReportPanel } from './ReportPanel';

@Entity({ name: 'panel_data_cache' })
export class PanelDataCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'panel_id', type: 'uuid' })
  panelId!: string;

  @ManyToOne(() => ReportPanel, (panel) => panel.cacheEntries, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'panel_id' })
  panel!: ReportPanel;

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @Column({ name: 'row_count', type: 'integer', nullable: true })
  rowCount!: number | null;

  @Column({ name: 'query_duration_ms', type: 'integer', nullable: true })
  queryDurationMs!: number | null;

  @Column({ name: 'executed_at', type: 'timestamptz', default: () => 'NOW()' })
  executedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;
}

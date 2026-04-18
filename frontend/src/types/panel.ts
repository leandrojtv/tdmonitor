export type PanelResultType = 'single_row' | 'table' | 'kpi' | 'bar_chart' | 'line_chart';

export type PanelFieldMapping = {
  source_column: string;
  target_field: string;
  data_type: 'number' | 'string' | 'date' | 'datetime';
  format?: string | null;
  label?: string;
};

export type PanelWidgetConfig = {
  col_span?: 3 | 4 | 6 | 8 | 12;
  row_span?: 1 | 2 | 3;
  min_height?: number;
  show_table?: boolean;
  show_legend?: boolean;
  show_header?: boolean;
  x_field?: string;
  y_field?: string;
  color?: string;
};

export type PanelFieldMappingsConfig = {
  result_type: PanelResultType;
  mappings: PanelFieldMapping[];
  widget?: PanelWidgetConfig;
};

export type PanelDefinition = {
  id: string;
  connectionId: string;
  panelKey: string;
  displayName: string;
  category: string;
  description: string | null;
  sqlQuery: string;
  fieldMappings: PanelFieldMappingsConfig;
  isEnabled: boolean;
  executionOrder: number;
  createdAt: string;
  updatedAt: string;
};

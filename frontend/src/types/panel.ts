export type PanelFieldMapping = {
  source_column: string;
  target_field: string;
  data_type: 'number' | 'string' | 'date' | 'datetime';
  format?: string | null;
  label?: string;
};

export type PanelDefinition = {
  id: string;
  connectionId: string;
  panelKey: string;
  displayName: string;
  category: string;
  description: string | null;
  sqlQuery: string;
  fieldMappings: {
    result_type: 'single_row' | 'table' | 'kpi' | 'bar_chart' | 'line_chart';
    mappings: PanelFieldMapping[];
  };
  isEnabled: boolean;
  executionOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MappingItem = {
  source_column: string;
  target_field: string;
  data_type?: 'number' | 'string' | 'date' | 'datetime';
  format?: string;
  label?: string;
};

export type WidgetConfig = {
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

export type FieldMappings = {
  result_type?: 'single_row' | 'table' | 'kpi' | 'bar_chart' | 'line_chart';
  mappings?: MappingItem[];
  widget?: WidgetConfig;
};

function formatDateBr(value: Date): string {
  const dd = `${value.getDate()}`.padStart(2, '0');
  const mm = `${value.getMonth() + 1}`.padStart(2, '0');
  const yyyy = value.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTimeBr(value: Date): string {
  const hh = `${value.getHours()}`.padStart(2, '0');
  const mi = `${value.getMinutes()}`.padStart(2, '0');
  const ss = `${value.getSeconds()}`.padStart(2, '0');
  return `${formatDateBr(value)} ${hh}:${mi}:${ss}`;
}

function applyFormat(raw: unknown, dataType?: string, format?: string): unknown {
  if (raw === null || raw === undefined) return raw;

  if (dataType === 'number') {
    const numeric = Number(raw);
    if (Number.isNaN(numeric)) return raw;

    switch (format) {
      case 'decimal_1':
        return Number(numeric.toFixed(1));
      case 'decimal_2':
        return Number(numeric.toFixed(2));
      case 'integer':
        return parseInt(String(numeric), 10);
      case 'percent':
        return parseFloat(String(numeric));
      case 'bytes_to_gb':
        return Number((numeric / (1024 * 1024 * 1024)).toFixed(2));
      case 'bytes_to_tb':
        return Number((numeric / (1024 * 1024 * 1024 * 1024)).toFixed(2));
      default:
        return numeric;
    }
  }

  if (dataType === 'string') {
    const text = String(raw);
    if (format === 'truncate_500') return text.substring(0, 500);
    if (format === 'uppercase') return text.toUpperCase();
    return text;
  }

  if (dataType === 'date' || dataType === 'datetime') {
    const date = new Date(String(raw));
    if (Number.isNaN(date.getTime())) return raw;

    if (dataType === 'date' && format === 'iso') return date.toISOString();
    if (dataType === 'date' && format === 'br') return formatDateBr(date);
    if (dataType === 'datetime' && format === 'br') return formatDateTimeBr(date);
    return date.toISOString();
  }

  return raw;
}

export function applyMapping(rawRows: Record<string, unknown>[], fieldMappings: FieldMappings) {
  const mappings = fieldMappings?.mappings ?? [];

  const rows = rawRows.map((row) => {
    const mapped: Record<string, unknown> = {};

    for (const item of mappings) {
      const sourceValue = row[item.source_column];
      mapped[item.target_field] = applyFormat(sourceValue, item.data_type, item.format);
    }

    return mapped;
  });

  return {
    result_type: fieldMappings?.result_type ?? 'table',
    columns: mappings.map((item) => ({
      source_column: item.source_column,
      target_field: item.target_field,
      label: item.label ?? item.target_field,
      data_type: item.data_type ?? 'string',
      format: item.format ?? null
    })),
    rows,
    widget: fieldMappings?.widget ?? {}
  };
}

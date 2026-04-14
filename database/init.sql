-- td-monitor - schema inicial PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualiza automaticamente updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS teradata_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 1025,
  username VARCHAR(100) NOT NULL,
  password TEXT NOT NULL,
  database_name VARCHAR(100),
  jdbc_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_test_at TIMESTAMPTZ,
  last_test_success BOOLEAN,
  last_test_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE teradata_connections IS 'Conexões JDBC Teradata configuradas por ambiente.';
COMMENT ON COLUMN teradata_connections.password IS 'Senha criptografada com AES-256 (chave em variável de ambiente).';
COMMENT ON COLUMN teradata_connections.jdbc_params IS 'Parâmetros extras JDBC (ex.: CHARSET, TMODE).';

CREATE TABLE IF NOT EXISTS report_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES teradata_connections(id) ON DELETE CASCADE,
  panel_key VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  sql_query TEXT NOT NULL,
  field_mappings JSONB NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  execution_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE report_panels IS 'Painéis e queries configuráveis para coleta no Teradata.';
COMMENT ON COLUMN report_panels.field_mappings IS 'Mapa entre colunas SQL e campos esperados pelo frontend.';

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES teradata_connections(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  cron_expression VARCHAR(50) NOT NULL,
  panel_ids UUID[] NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  last_run_duration_ms INTEGER,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE schedules IS 'Agendamentos (cron) de execução dos painéis.';
COMMENT ON COLUMN schedules.last_run_status IS 'Valores esperados: success, error, running.';

CREATE TABLE IF NOT EXISTS panel_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES report_panels(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  row_count INTEGER,
  query_duration_ms INTEGER,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE panel_data_cache IS 'Cache dos resultados já transformados para o frontend.';

CREATE TABLE IF NOT EXISTS execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  panel_id UUID REFERENCES report_panels(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES teradata_connections(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,
  duration_ms INTEGER,
  row_count INTEGER,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE execution_log IS 'Histórico das execuções dos painéis/schedules.';
COMMENT ON COLUMN execution_log.status IS 'Valores esperados: success, error.';

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_teradata_connections_is_active ON teradata_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_report_panels_connection_id ON report_panels(connection_id);
CREATE INDEX IF NOT EXISTS idx_report_panels_category ON report_panels(category);
CREATE INDEX IF NOT EXISTS idx_report_panels_enabled_order ON report_panels(is_enabled, execution_order);
CREATE INDEX IF NOT EXISTS idx_schedules_connection_id ON schedules(connection_id);
CREATE INDEX IF NOT EXISTS idx_schedules_is_enabled ON schedules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_panel_data_cache_panel_executed ON panel_data_cache(panel_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_panel_data_cache_expires_at ON panel_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_execution_log_executed_at ON execution_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_log_status ON execution_log(status);
CREATE INDEX IF NOT EXISTS idx_execution_log_schedule_id ON execution_log(schedule_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_panel_id ON execution_log(panel_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_connection_id ON execution_log(connection_id);

-- Índices JSONB
CREATE INDEX IF NOT EXISTS idx_teradata_connections_jdbc_params_gin ON teradata_connections USING GIN(jdbc_params);
CREATE INDEX IF NOT EXISTS idx_report_panels_field_mappings_gin ON report_panels USING GIN(field_mappings);
CREATE INDEX IF NOT EXISTS idx_panel_data_cache_data_gin ON panel_data_cache USING GIN(data);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS trg_teradata_connections_updated_at ON teradata_connections;
CREATE TRIGGER trg_teradata_connections_updated_at
BEFORE UPDATE ON teradata_connections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_report_panels_updated_at ON report_panels;
CREATE TRIGGER trg_report_panels_updated_at
BEFORE UPDATE ON report_panels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;
CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

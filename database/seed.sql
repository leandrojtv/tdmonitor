-- Seed inicial td-monitor
-- ATENÇÃO: Substitua os blocos SQL abaixo pelas queries EXATAS do documento de referência.

WITH default_connection AS (
  INSERT INTO teradata_connections (
    name,
    host,
    port,
    username,
    password,
    database_name,
    jdbc_params,
    is_active
  )
  VALUES (
    'Produção MDS',
    'teradata-host',
    1025,
    'dbc',
    'ENCRYPTED_PASSWORD_PLACEHOLDER',
    'dbc',
    '{}'::jsonb,
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id
),
resolved_connection AS (
  SELECT id FROM default_connection
  UNION ALL
  SELECT id FROM teradata_connections WHERE name = 'Produção MDS' LIMIT 1
)
INSERT INTO report_panels (
  connection_id,
  panel_key,
  display_name,
  category,
  description,
  sql_query,
  field_mappings,
  is_enabled,
  execution_order
)
SELECT
  rc.id,
  p.panel_key,
  p.display_name,
  p.category,
  p.description,
  p.sql_query,
  p.field_mappings::jsonb,
  true,
  p.execution_order
FROM resolved_connection rc
CROSS JOIN (
  VALUES
    (
      'system_disk_total',
      'Total do Sistema',
      'storage',
      'Query 1.1 - Total do Sistema',
      $$-- Query 1.1 (cole aqui o SQL exato do documento)
SELECT MaxPerm_TB, CurrentPerm_TB, Percentual_Usado, Disponivel_TB;$$,
      $$
      {
        "result_type": "single_row",
        "mappings": [
          { "source_column": "MaxPerm_TB", "target_field": "maxPerm_TB", "data_type": "number", "format": "decimal_1", "label": "Alocado (TB)" },
          { "source_column": "CurrentPerm_TB", "target_field": "currentPerm_TB", "data_type": "number", "format": "decimal_1", "label": "Utilizado (TB)" },
          { "source_column": "Percentual_Usado", "target_field": "percentUsed", "data_type": "number", "format": "percent", "label": "% Uso" },
          { "source_column": "Disponivel_TB", "target_field": "available_TB", "data_type": "number", "format": "decimal_1", "label": "Disponível (TB)" }
        ]
      }
      $$,
      1
    ),
    ('disk_by_database','Espaço por Database','storage','Query 1.2 - Por Database',$$-- Query 1.2
SELECT DatabaseName, MaxPerm_GB, CurrentPerm_GB, Percentual_Usado, Disponivel_GB;$$,$${"result_type":"table","mappings":[{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"MaxPerm_GB","target_field":"maxPerm_GB","data_type":"number","format":"decimal_2","label":"Alocado (GB)"},{"source_column":"CurrentPerm_GB","target_field":"currentPerm_GB","data_type":"number","format":"decimal_2","label":"Utilizado (GB)"},{"source_column":"Percentual_Usado","target_field":"percentUsed","data_type":"number","format":"percent","label":"% Uso"},{"source_column":"Disponivel_GB","target_field":"available_GB","data_type":"number","format":"decimal_2","label":"Disponível (GB)"}]}$$,2),
    ('disk_forecast','Previsão de Consumo','storage','Query 1.3 - Forecast',$$-- Query 1.3
SELECT Data_Coleta, DatabaseName, CurrentPerm_TB, MaxPerm_TB, Espaco_Livre_TB, Percentual_Uso;$$,$${"result_type":"table","mappings":[{"source_column":"Data_Coleta","target_field":"collectionDate","data_type":"date","label":"Data"},{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"CurrentPerm_TB","target_field":"currentPerm_TB","data_type":"number","format":"decimal_2","label":"Usado (TB)"},{"source_column":"MaxPerm_TB","target_field":"maxPerm_TB","data_type":"number","format":"decimal_2","label":"Alocado (TB)"},{"source_column":"Espaco_Livre_TB","target_field":"freeSpace_TB","data_type":"number","format":"decimal_2","label":"Livre (TB)"},{"source_column":"Percentual_Uso","target_field":"percentUse","data_type":"number","format":"percent","label":"% Uso"}]}$$,3),
    ('underutilized_databases','Databases Subutilizadas','storage','Query 1.4 - Subutilizadas',$$-- Query 1.4
SELECT DatabaseName, Alocado_GB, Utilizado_GB, Desperdicio_GB, Percentual_Uso;$$,$${"result_type":"table","mappings":[{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"Alocado_GB","target_field":"allocated_GB","data_type":"number","format":"decimal_2","label":"Alocado (GB)"},{"source_column":"Utilizado_GB","target_field":"used_GB","data_type":"number","format":"decimal_2","label":"Utilizado (GB)"},{"source_column":"Desperdicio_GB","target_field":"waste_GB","data_type":"number","format":"decimal_2","label":"Desperdício (GB)"},{"source_column":"Percentual_Uso","target_field":"percentUse","data_type":"number","format":"percent","label":"% Uso"}]}$$,4),
    ('top_skew','Top Skew','performance','Query 2.1 - Skew',$$-- Query 2.1
SELECT DatabaseName, TableName, Tamanho_GB, Skew_Factor;$$,$${"result_type":"table","mappings":[{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"TableName","target_field":"tableName","data_type":"string","label":"Tabela"},{"source_column":"Tamanho_GB","target_field":"size_GB","data_type":"number","format":"decimal_2","label":"Tamanho (GB)"},{"source_column":"Skew_Factor","target_field":"skewFactor","data_type":"number","format":"decimal_2","label":"Skew Factor"}]}$$,5),
    ('high_cpu_queries','Queries com CPU Alta','performance','Query 2.4 - CPU Alto',$$-- Query 2.4
SELECT UserName, SessionID, QueryID, CPU_Seconds, Total_IO, StartTime, Query_Resumo;$$,$${"result_type":"table","mappings":[{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"SessionID","target_field":"sessionId","data_type":"string","label":"Sessão"},{"source_column":"QueryID","target_field":"queryId","data_type":"string","label":"Query ID"},{"source_column":"CPU_Seconds","target_field":"cpuSeconds","data_type":"number","format":"decimal_2","label":"CPU (s)"},{"source_column":"Total_IO","target_field":"totalIo","data_type":"number","label":"Total IO"},{"source_column":"StartTime","target_field":"startTime","data_type":"datetime","label":"Início"},{"source_column":"Query_Resumo","target_field":"querySummary","data_type":"string","label":"Resumo"}]}$$,6),
    ('failed_logins','Falhas de Login','security','Query 3.1 - Falhas',$$-- Query 3.1
SELECT LogonDate, LogonTime, UserName, Event, ClientIpAddress, ClientProgramName, Tentativas;$$,$${"result_type":"table","mappings":[{"source_column":"LogonDate","target_field":"logonDate","data_type":"date","label":"Data"},{"source_column":"LogonTime","target_field":"logonTime","data_type":"time","label":"Hora"},{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"Event","target_field":"event","data_type":"string","label":"Evento"},{"source_column":"ClientIpAddress","target_field":"clientIpAddress","data_type":"string","label":"IP"},{"source_column":"ClientProgramName","target_field":"clientProgramName","data_type":"string","label":"Programa"},{"source_column":"Tentativas","target_field":"attempts","data_type":"number","label":"Tentativas"}]}$$,7),
    ('brute_force','Possível Força Bruta','security','Query 3.2 - Força Bruta',$$-- Query 3.2
SELECT UserName, ClientIpAddress, Event, Total_Tentativas_Falhas, Primeira_Tentativa, Ultima_Tentativa;$$,$${"result_type":"table","mappings":[{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"ClientIpAddress","target_field":"clientIpAddress","data_type":"string","label":"IP"},{"source_column":"Event","target_field":"event","data_type":"string","label":"Evento"},{"source_column":"Total_Tentativas_Falhas","target_field":"totalFailedAttempts","data_type":"number","label":"Total Falhas"},{"source_column":"Primeira_Tentativa","target_field":"firstAttempt","data_type":"datetime","label":"Primeira Tentativa"},{"source_column":"Ultima_Tentativa","target_field":"lastAttempt","data_type":"datetime","label":"Última Tentativa"}]}$$,8),
    ('inactive_users','Usuários Inativos','security','Query 3.3 - Inativos',$$-- Query 3.3
SELECT UserName, Usuario_Criado_Em, Ultimo_Acesso, Dias_Sem_Acesso;$$,$${"result_type":"table","mappings":[{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"Usuario_Criado_Em","target_field":"userCreatedAt","data_type":"date","label":"Criado em"},{"source_column":"Ultimo_Acesso","target_field":"lastAccess","data_type":"datetime","label":"Último acesso"},{"source_column":"Dias_Sem_Acesso","target_field":"daysWithoutAccess","data_type":"number","label":"Dias sem acesso"}]}$$,9),
    ('access_by_database_rights','Acessos por Database','security','Query 3.4 - Acessos',$$-- Query 3.4
SELECT DatabaseName, Total_Usuarios_Com_Acesso, Com_Permissao_Escrita, Somente_Leitura;$$,$${"result_type":"table","mappings":[{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"Total_Usuarios_Com_Acesso","target_field":"usersWithAccess","data_type":"number","label":"Total com Acesso"},{"source_column":"Com_Permissao_Escrita","target_field":"withWritePermission","data_type":"number","label":"Com Escrita"},{"source_column":"Somente_Leitura","target_field":"readOnly","data_type":"number","label":"Somente Leitura"}]}$$,10),
    ('database_query_activity','Atividade por Database','performance','Query 4.1 - Atividade',$$-- Query 4.1
SELECT DatabaseName, Total_Queries, Usuarios_Distintos, Total_CPU_Time, Total_IO;$$,$${"result_type":"table","mappings":[{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"Total_Queries","target_field":"totalQueries","data_type":"number","label":"Queries"},{"source_column":"Usuarios_Distintos","target_field":"distinctUsers","data_type":"number","label":"Usuários Distintos"},{"source_column":"Total_CPU_Time","target_field":"totalCpuTime","data_type":"number","format":"decimal_2","label":"CPU Total"},{"source_column":"Total_IO","target_field":"totalIo","data_type":"number","label":"IO Total"}]}$$,11),
    ('critical_db_activity','Atividade em DBs Críticos','performance','Query 4.2 - Críticos',$$-- Query 4.2
SELECT ObjectDatabaseName, UserName, Total_Execucoes, Primeira_Execucao, Ultima_Execucao;$$,$${"result_type":"table","mappings":[{"source_column":"ObjectDatabaseName","target_field":"objectDatabaseName","data_type":"string","label":"Database"},{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"Total_Execucoes","target_field":"totalExecutions","data_type":"number","label":"Execuções"},{"source_column":"Primeira_Execucao","target_field":"firstExecution","data_type":"datetime","label":"Primeira Execução"},{"source_column":"Ultima_Execucao","target_field":"lastExecution","data_type":"datetime","label":"Última Execução"}]}$$,12),
    ('active_sessions','Sessões Ativas','sessions','Query 5.1 - Sessões Ativas',$$-- Query 5.1
SELECT Total_Sessoes_Ativas, Usuarios_Distintos, IPs_Distintos;$$,$${"result_type":"kpi","mappings":[{"source_column":"Total_Sessoes_Ativas","target_field":"totalActiveSessions","data_type":"number","label":"Sessões Ativas"},{"source_column":"Usuarios_Distintos","target_field":"distinctUsers","data_type":"number","label":"Usuários Distintos"},{"source_column":"IPs_Distintos","target_field":"distinctIps","data_type":"number","label":"IPs Distintos"}]}$$,13),
    ('sessions_by_user','Sessões por Usuário','sessions','Query 5.2 - Sessões por Usuário',$$-- Query 5.2
SELECT UserName, Sessoes_Ativas, Primeira_Conexao, Ultima_Conexao;$$,$${"result_type":"table","mappings":[{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"Sessoes_Ativas","target_field":"activeSessions","data_type":"number","label":"Sessões"},{"source_column":"Primeira_Conexao","target_field":"firstConnection","data_type":"datetime","label":"Primeira Conexão"},{"source_column":"Ultima_Conexao","target_field":"lastConnection","data_type":"datetime","label":"Última Conexão"}]}$$,14),
    ('logon_pattern','Padrão de Logon','sessions','Query 5.3 - Padrão de Logon',$$-- Query 5.3
SELECT LogonDate, Hora, Total_Logons, Usuarios_Distintos;$$,$${"result_type":"table","mappings":[{"source_column":"LogonDate","target_field":"logonDate","data_type":"date","label":"Data"},{"source_column":"Hora","target_field":"hour","data_type":"string","label":"Hora"},{"source_column":"Total_Logons","target_field":"totalLogons","data_type":"number","label":"Total Logons"},{"source_column":"Usuarios_Distintos","target_field":"distinctUsers","data_type":"number","label":"Usuários Distintos"}]}$$,15),
    ('query_status','Status de Queries','performance','Query 5.4 - Status de Query',$$-- Query 5.4
SELECT Status_Query, Total_Queries, Media_CPU, Total_CPU;$$,$${"result_type":"table","mappings":[{"source_column":"Status_Query","target_field":"queryStatus","data_type":"string","label":"Status"},{"source_column":"Total_Queries","target_field":"totalQueries","data_type":"number","label":"Total Queries"},{"source_column":"Media_CPU","target_field":"avgCpu","data_type":"number","format":"decimal_2","label":"Média CPU"},{"source_column":"Total_CPU","target_field":"totalCpu","data_type":"number","format":"decimal_2","label":"CPU Total"}]}$$,16),
    ('permission_analysis','Análise de Permissões','access','Query 6.1 - Permissões',$$-- Query 6.1
SELECT UserName, DatabaseName, Tabelas_Com_Acesso, Tipos_Permissao_Diferentes;$$,$${"result_type":"table","mappings":[{"source_column":"UserName","target_field":"userName","data_type":"string","label":"Usuário"},{"source_column":"DatabaseName","target_field":"databaseName","data_type":"string","label":"Database"},{"source_column":"Tabelas_Com_Acesso","target_field":"tablesWithAccess","data_type":"number","label":"Tabelas com Acesso"},{"source_column":"Tipos_Permissao_Diferentes","target_field":"differentPermissionTypes","data_type":"number","label":"Tipos de Permissão"}]}$$,17)
) AS p(panel_key, display_name, category, description, sql_query, field_mappings, execution_order)
ON CONFLICT (panel_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  sql_query = EXCLUDED.sql_query,
  field_mappings = EXCLUDED.field_mappings,
  is_enabled = EXCLUDED.is_enabled,
  execution_order = EXCLUDED.execution_order,
  updated_at = NOW();

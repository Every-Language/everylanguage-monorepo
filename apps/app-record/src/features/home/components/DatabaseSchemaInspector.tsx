import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@powersync/react';
import { colors } from '@/shared/constants/colors';

/**
 * Database Schema Inspector
 *
 * Inspects the local PowerSync SQLite database to see:
 * - All tables that exist
 * - Table schemas (columns and types)
 * - Row counts
 * - PowerSync internal tables
 *
 * Useful for debugging initialization issues.
 */
export const DatabaseSchemaInspector: React.FC = () => {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // Query SQLite metadata to get all tables
  const { data: tables, error: tablesError } = useQuery<{ name: string }>(
    `SELECT name FROM sqlite_master 
     WHERE type='table' 
     AND name NOT LIKE 'sqlite_%'
     AND name NOT LIKE '__powersync_%'
     ORDER BY name`
  );

  // Query PowerSync internal tables
  const { data: powerSyncTables } = useQuery<{ name: string }>(
    `SELECT name FROM sqlite_master 
     WHERE type='table' 
     AND name LIKE '__powersync_%'
     ORDER BY name`
  );

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  if (tablesError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Database Schema Inspector</Text>
        <Text style={styles.errorText}>
          Error querying database: {tablesError.message}
        </Text>
        <Text style={styles.hintText}>
          This might indicate PowerSync hasn&apos;t initialized yet.
        </Text>
      </View>
    );
  }

  if (!tables || tables.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Database Schema Inspector</Text>
        <Text style={styles.warningText}>⚠️ No tables found in database</Text>
        <Text style={styles.hintText}>
          PowerSync may not have initialized yet, or tables haven&apos;t been
          created.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Database Schema Inspector</Text>
      <Text style={styles.subtitle}>
        Found {tables.length} table{tables.length !== 1 ? 's' : ''}
      </Text>

      {/* PowerSync Internal Tables */}
      {powerSyncTables && powerSyncTables.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PowerSync Internal Tables ({powerSyncTables.length})
          </Text>
          {powerSyncTables.map(table => (
            <Text key={table.name} style={styles.internalTableName}>
              • {table.name}
            </Text>
          ))}
        </View>
      )}

      {/* User Tables */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tables</Text>
        {tables.map(table => (
          <TableSchemaViewer
            key={table.name}
            tableName={table.name}
            isExpanded={expandedTables.has(table.name)}
            onToggle={() => toggleTable(table.name)}
          />
        ))}
      </View>
    </ScrollView>
  );
};

interface TableSchemaViewerProps {
  tableName: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const TableSchemaViewer: React.FC<TableSchemaViewerProps> = ({
  tableName,
  isExpanded,
  onToggle,
}) => {
  // Get table schema (column info)
  const { data: schema } = useQuery<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>(`PRAGMA table_info("${tableName}")`);

  // Get row count
  const { data: countResult } = useQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM "${tableName}"`
  );

  const rowCount = countResult?.[0]?.count ?? 0;

  return (
    <View style={styles.tableCard}>
      <TouchableOpacity onPress={onToggle} style={styles.tableHeader}>
        <View style={styles.tableHeaderContent}>
          <Text style={styles.tableName}>{tableName}</Text>
          <Text style={styles.rowCount}>
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {isExpanded && schema && (
        <View style={styles.schemaContainer}>
          <Text style={styles.schemaTitle}>Schema:</Text>
          <View style={styles.schemaTable}>
            <View style={styles.schemaRow}>
              <Text style={[styles.schemaCell, styles.schemaHeader]}>
                Column
              </Text>
              <Text style={[styles.schemaCell, styles.schemaHeader]}>Type</Text>
              <Text style={[styles.schemaCell, styles.schemaHeader]}>PK</Text>
              <Text style={[styles.schemaCell, styles.schemaHeader]}>
                NotNull
              </Text>
            </View>
            {schema.map(col => (
              <View key={col.cid} style={styles.schemaRow}>
                <Text style={styles.schemaCell}>{col.name}</Text>
                <Text style={styles.schemaCell}>{col.type}</Text>
                <Text style={styles.schemaCell}>{col.pk ? '✓' : ''}</Text>
                <Text style={styles.schemaCell}>{col.notnull ? '✓' : ''}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.textPrimary,
  },
  tableCard: {
    backgroundColor: colors.grayLight,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tableHeaderContent: {
    flex: 1,
  },
  tableName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowCount: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.gray,
    marginLeft: 8,
  },
  schemaContainer: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.gray,
  },
  schemaTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  schemaTable: {
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 4,
  },
  schemaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray,
  },
  schemaCell: {
    flex: 1,
    padding: 6,
    fontSize: 11,
    color: colors.textPrimary,
  },
  schemaHeader: {
    fontWeight: '600',
    backgroundColor: colors.gray,
  },
  internalTableName: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  errorText: {
    color: colors.error,
    padding: 8,
    marginBottom: 8,
  },
  warningText: {
    color: colors.warning,
    padding: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
    padding: 8,
  },
});

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@powersync/react';
import { colors } from '@/shared/constants/colors';

interface TableDataViewerProps {
  tableName: string;
}

const TableDataViewer: React.FC<TableDataViewerProps> = ({ tableName }) => {
  // Table names are hardcoded, so safe to use in query
  // Using double quotes for SQLite table name escaping
  // Try to query the table, but handle case where table doesn't exist yet
  const { data, error } = useQuery(
    `SELECT * FROM "${tableName}" ORDER BY id LIMIT 50`
  );

  if (error) {
    // Check if it's a "no such table" error - this is expected before sync completes
    const isTableNotFound =
      error.message?.includes('no such table') ||
      error.message?.includes('does not exist');

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>{tableName}</Text>
        <Text style={styles.errorText}>
          {isTableNotFound
            ? 'Table not synced yet (waiting for initial sync)'
            : `Error: ${error.message}`}
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>{tableName}</Text>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>
        {tableName} ({data.length} rows)
      </Text>
      <ScrollView
        horizontal
        style={styles.tableScroll}
        contentContainerStyle={styles.tableContent}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow}>
            {Object.keys(data[0]).map(key => (
              <Text key={key} style={styles.tableHeader}>
                {key}
              </Text>
            ))}
          </View>
          {/* Rows */}
          {data.map((row: Record<string, unknown>, index: number) => (
            <View key={index} style={styles.tableRow}>
              {Object.values(row).map((value, cellIndex) => (
                <Text key={cellIndex} style={styles.tableCell}>
                  {value === null || value === undefined
                    ? 'NULL'
                    : typeof value === 'object'
                      ? JSON.stringify(value).substring(0, 50)
                      : String(value).substring(0, 50)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export const LocalDataViewer: React.FC = () => {
  const tables = [
    'projects',
    'sequences',
    'segments',
    'audio_versions',
    'media_files',
    'media_files_verses',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local PowerSync Data</Text>
      {tables.map(table => (
        <TableDataViewer key={table} tableName={table} />
      ))}
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
    marginBottom: 16,
    color: colors.text,
  },
  tableContainer: {
    marginBottom: 24,
    backgroundColor: colors.grayLight,
    borderRadius: 8,
    padding: 12,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  tableScroll: {
    maxHeight: 300,
  },
  tableContent: {
    paddingRight: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray,
  },
  tableHeader: {
    padding: 8,
    fontWeight: '600',
    backgroundColor: colors.gray,
    color: colors.text,
    minWidth: 100,
    fontSize: 12,
  },
  tableCell: {
    padding: 8,
    color: colors.text,
    minWidth: 100,
    fontSize: 11,
    borderRightWidth: 1,
    borderRightColor: colors.gray,
  },
  emptyText: {
    color: colors.gray,
    fontStyle: 'italic',
    padding: 8,
  },
  errorText: {
    color: colors.error,
    padding: 8,
  },
});

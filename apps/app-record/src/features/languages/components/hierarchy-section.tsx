import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { LanguageHierarchyNode, RegionHierarchyNode } from '../hooks';

interface HierarchySectionProps {
  type: 'language' | 'region';
  nodes: Array<LanguageHierarchyNode | RegionHierarchyNode>;
  currentId: string;
  onSelectNode: (nodeId: string, nodeName: string) => void;
}

type TreeNode = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  children: string[];
};

/**
 * HierarchySection Component
 *
 * Displays an expandable hierarchy tree for languages or regions.
 * Clicking on a node opens a menu with "Select this language/region instead" option.
 */
export const HierarchySection: React.FC<HierarchySectionProps> = ({
  type,
  nodes,
  currentId,
  onSelectNode,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Build tree structure
  const nodesById = useMemo(() => {
    const map = new Map<string, TreeNode>();

    for (const node of nodes) {
      const id =
        type === 'language'
          ? (node as LanguageHierarchyNode).hierarchy_entity_id
          : (node as RegionHierarchyNode).hierarchy_region_id;
      const name =
        type === 'language'
          ? (node as LanguageHierarchyNode).hierarchy_entity_name
          : (node as RegionHierarchyNode).hierarchy_region_name;
      const level =
        type === 'language'
          ? (node as LanguageHierarchyNode).hierarchy_entity_level
          : (node as RegionHierarchyNode).hierarchy_region_level;
      const parentId =
        type === 'language'
          ? (node as LanguageHierarchyNode).hierarchy_parent_id
          : (node as RegionHierarchyNode).hierarchy_parent_id;

      if (!map.has(id)) {
        map.set(id, { id, name, level, parentId, children: [] });
      }
    }

    // Build parent-child relationships
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node.id);
      }
    }

    return map;
  }, [nodes, type]);

  // Find root node (self or top ancestor)
  const rootNode = useMemo(() => {
    const self = nodes.find(
      n =>
        (type === 'language'
          ? (n as LanguageHierarchyNode).hierarchy_entity_id
          : (n as RegionHierarchyNode).hierarchy_region_id) === currentId
    );

    if (!self) return null;

    const selfId =
      type === 'language'
        ? (self as LanguageHierarchyNode).hierarchy_entity_id
        : (self as RegionHierarchyNode).hierarchy_region_id;

    // Find top ancestor
    let node = nodesById.get(selfId);
    while (node?.parentId && nodesById.has(node.parentId)) {
      node = nodesById.get(node.parentId);
    }

    return node || nodesById.get(selfId) || null;
  }, [nodes, nodesById, currentId, type]);

  const toggleExpanded = (nodeId: string): void => {
    setExpanded(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleNodePress = (nodeId: string, nodeName: string): void => {
    if (nodeId === currentId) return;
    onSelectNode(nodeId, nodeName);
  };

  const renderNode = (nodeId: string, depth: number = 0): React.ReactNode => {
    const node = nodesById.get(nodeId);
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isExpanded = expanded[nodeId] ?? depth === 0; // Root is expanded by default
    const isCurrent = nodeId === currentId;

    const menuActions: MenuAction[] = [
      {
        id: 'select',
        title: `Select this ${type === 'language' ? 'language' : 'region'} instead`,
      },
    ];

    return (
      <View key={nodeId} style={styles.nodeContainer}>
        <View style={[styles.nodeRow, { paddingLeft: depth * 16 }]}>
          {hasChildren ? (
            <TouchableOpacity
              onPress={() => toggleExpanded(nodeId)}
              style={styles.expandButton}>
              <Ionicons
                name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.expandButtonPlaceholder} />
          )}

          <MenuView
            onPressAction={({ nativeEvent }) => {
              if (nativeEvent.event === 'select') {
                handleNodePress(nodeId, node.name);
              }
            }}
            actions={menuActions}>
            <TouchableOpacity
              style={styles.nodeButton}
              activeOpacity={0.7}
              disabled={isCurrent}>
              <Text
                style={[
                  styles.nodeName,
                  isCurrent && styles.nodeNameCurrent,
                  {
                    color: isCurrent ? theme.colors.accent : theme.colors.text,
                  },
                ]}>
                {node.name}
              </Text>
              <Text
                style={[
                  styles.nodeLevel,
                  { color: theme.colors.textSecondary },
                ]}>
                {node.level}
              </Text>
            </TouchableOpacity>
          </MenuView>
        </View>

        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {node.children.map(childId => renderNode(childId, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  if (!rootNode) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No hierarchy data available
        </Text>
      </View>
    );
  }

  return <View style={styles.container}>{renderNode(rootNode.id)}</View>;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  nodeContainer: {
    marginVertical: 2,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  expandButtonPlaceholder: {
    width: 24,
    marginRight: 4,
  },
  nodeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nodeName: {
    fontSize: 15,
    marginRight: 8,
  },
  nodeNameCurrent: {
    fontWeight: '600',
  },
  nodeLevel: {
    fontSize: 12,
  },
  childrenContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

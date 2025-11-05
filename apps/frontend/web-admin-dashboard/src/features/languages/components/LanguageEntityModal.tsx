import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { languagesApi } from '../api/languagesApi';
import { useAuth } from '@/features/auth';
import type { LanguageEntityWithRegions } from '@/types';
import { X, Edit, Save, Plus, Trash2, Search } from 'lucide-react';

interface LanguageEntityModalProps {
  entity: LanguageEntityWithRegions;
  onClose: () => void;
  onSave: () => void;
  onNavigateToLanguage?: (entityId: string) => void;
  onNavigateToRegion?: (regionId: string) => void;
}

type TreeNode = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  children: string[];
};

export function LanguageEntityModal({
  entity,
  onClose,
  onSave,
  onNavigateToLanguage,
  onNavigateToRegion,
}: LanguageEntityModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);

  // Section editing states
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingProperties, setEditingProperties] = useState(false);
  const [editingAliases, setEditingAliases] = useState(false);
  const [editingRegions, setEditingRegions] = useState(false);

  // Form states for Language Info
  const [name, setName] = useState(entity.name);
  const [level, setLevel] = useState(entity.level);

  // Hierarchy tree state
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Trigger entrance animation
    setIsEntering(false);
  }, []);

  // Fetch full entity data with regions
  const { data: fullEntity } = useQuery({
    queryKey: ['language-entity-full', entity.id],
    queryFn: () => languagesApi.fetchLanguageEntityById(entity.id),
  });

  // Fetch hierarchy
  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['language-hierarchy', entity.id],
    queryFn: () => languagesApi.fetchLanguageHierarchy(entity.id),
  });

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ['language-properties', entity.id],
    queryFn: () => languagesApi.fetchLanguageProperties(entity.id),
  });

  // Fetch aliases
  const { data: aliases } = useQuery({
    queryKey: ['language-aliases', entity.id],
    queryFn: () => languagesApi.fetchLanguageAliases(entity.id),
  });

  // Local states for editing
  const [localProperties, setLocalProperties] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [localAliases, setLocalAliases] = useState<
    Array<{ alias_name: string }>
  >([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [regionSearchQuery, setRegionSearchQuery] = useState('');

  // Sync local states with fetched data
  useEffect(() => {
    if (properties) {
      setLocalProperties(
        properties.map(p => ({ key: p.key || '', value: p.value || '' }))
      );
    }
  }, [properties]);

  useEffect(() => {
    if (aliases) {
      setLocalAliases(aliases.map(a => ({ alias_name: a.alias_name || '' })));
    }
  }, [aliases]);

  useEffect(() => {
    if (fullEntity?.regions) {
      setSelectedRegionIds(fullEntity.regions.map(r => r.id));
    }
  }, [fullEntity]);

  // Build tree structure from hierarchy
  const { nodesById, rootId } = useMemo(() => {
    const map = new Map<string, TreeNode>();
    if (!hierarchy) return { nodesById: map, rootId: null };

    for (const h of hierarchy) {
      if (!map.has(h.hierarchy_entity_id)) {
        map.set(h.hierarchy_entity_id, {
          id: h.hierarchy_entity_id,
          name: h.hierarchy_entity_name,
          level: h.hierarchy_entity_level,
          parentId: h.hierarchy_parent_id,
          children: [],
        });
      }
    }

    // Build parent-child relationships
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node.id);
      }
    }

    // Find root node (top-most ancestor)
    const self = hierarchy.find(h => h.relationship_type === 'self');
    const ancestors = hierarchy.filter(h => h.relationship_type === 'ancestor');
    const root =
      ancestors.length > 0
        ? ancestors.reduce((min, r) =>
            r.generation_distance < min.generation_distance ? r : min
          )
        : self;

    return { nodesById: map, rootId: root?.hierarchy_entity_id || null };
  }, [hierarchy]);

  // Auto-expand all nodes on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !nodesById.size) return;
    const openAll: Record<string, boolean> = {};
    for (const key of nodesById.keys()) {
      openAll[key] = true;
    }
    setOpenNodes(openAll);
    initializedRef.current = true;
  }, [nodesById]);

  // Search regions for adding
  const { data: searchedRegions } = useQuery({
    queryKey: ['search-regions', regionSearchQuery],
    queryFn: () => languagesApi.searchRegions(regionSearchQuery),
    enabled: editingRegions && regionSearchQuery.length >= 2,
  });

  // Mutations
  const updateInfoMutation = useMutation({
    mutationFn: async () => {
      await languagesApi.updateLanguageEntity(entity.id, { name, level });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['language-entities'] });
      queryClient.invalidateQueries({
        queryKey: ['language-entity-full', entity.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['language-hierarchy', entity.id],
      });
      setEditingInfo(false);
      onSave();
    },
  });

  const updatePropertiesMutation = useMutation({
    mutationFn: async () => {
      await languagesApi.updateLanguageProperties(
        entity.id,
        localProperties.filter(p => p.key && p.value)
      );
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['language-properties', entity.id],
      });
      setEditingProperties(false);
    },
  });

  const updateAliasesMutation = useMutation({
    mutationFn: async () => {
      await languagesApi.updateLanguageAliases(
        entity.id,
        localAliases.filter(a => a.alias_name)
      );
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['language-aliases', entity.id],
      });
      setEditingAliases(false);
    },
  });

  const updateRegionsMutation = useMutation({
    mutationFn: async () => {
      await languagesApi.updateLanguageEntityRegions(
        entity.id,
        selectedRegionIds
      );
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['language-entity-full', entity.id],
      });
      await queryClient.refetchQueries({ queryKey: ['language-entities'] });
      setEditingRegions(false);
      setRegionSearchQuery('');
    },
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAddProperty = () => {
    setLocalProperties([...localProperties, { key: '', value: '' }]);
  };

  const handleRemoveProperty = (index: number) => {
    setLocalProperties(localProperties.filter((_, i) => i !== index));
  };

  const handleAddAlias = () => {
    setLocalAliases([...localAliases, { alias_name: '' }]);
  };

  const handleRemoveAlias = (index: number) => {
    setLocalAliases(localAliases.filter((_, i) => i !== index));
  };

  const handleToggleRegion = (regionId: string) => {
    if (selectedRegionIds.includes(regionId)) {
      setSelectedRegionIds(selectedRegionIds.filter(id => id !== regionId));
    } else {
      setSelectedRegionIds([...selectedRegionIds, regionId]);
    }
  };

  const toggleNode = (nodeId: string) => {
    setOpenNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Render hierarchy tree
  const renderNode = (nodeId: string): React.ReactElement | null => {
    const node = nodesById.get(nodeId);
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isCurrentEntity = nodeId === entity.id;

    return (
      <div key={nodeId} className='ml-2'>
        <div className='flex items-center gap-2 py-0.5'>
          {hasChildren ? (
            <button
              className='w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
              onClick={() => toggleNode(nodeId)}
              aria-label={openNodes[nodeId] ? 'Collapse' : 'Expand'}
            >
              {openNodes[nodeId] ? '▾' : '▸'}
            </button>
          ) : (
            <span className='w-5 h-5' />
          )}
          <button
            className={`text-sm underline-offset-2 hover:underline transition-colors ${
              isCurrentEntity
                ? 'text-primary-600 dark:text-primary-500 font-semibold'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}
            onClick={() => {
              if (!isCurrentEntity && onNavigateToLanguage) {
                onNavigateToLanguage(nodeId);
              }
            }}
          >
            {node.name}
          </button>
          <span
            className={`text-xs ${
              isCurrentEntity
                ? 'text-primary-600 dark:text-primary-500'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {node.level}
          </span>
        </div>
        {hasChildren && openNodes[nodeId] && (
          <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2'>
            {node.children.map(childId => renderNode(childId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop with fade animation */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Slide panel with animation */}
      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isClosing
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {entity.name}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Language Entity Details
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* 1. Language Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Language Information
              </h3>
              {!editingInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Name
                </label>
                {editingInfo ? (
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {entity.name}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Level
                </label>
                {editingInfo ? (
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value as typeof level)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  >
                    <option value='family'>Family</option>
                    <option value='language'>Language</option>
                    <option value='dialect'>Dialect</option>
                    <option value='mother_tongue'>Mother Tongue</option>
                  </select>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {entity.level}
                  </p>
                )}
              </div>
              {editingInfo && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={() => {
                      setEditingInfo(false);
                      setName(entity.name);
                      setLevel(entity.level);
                    }}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateInfoMutation.mutate()}
                    disabled={updateInfoMutation.isPending}
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                  >
                    <Save className='h-4 w-4' />
                    {updateInfoMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. Language Hierarchy */}
          <section>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
              Language Hierarchy
            </h3>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              {hierarchyLoading ? (
                <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                  Loading hierarchy...
                </div>
              ) : rootId ? (
                <div className='text-sm'>{renderNode(rootId)}</div>
              ) : (
                <p className='text-neutral-500 dark:text-neutral-400'>
                  No hierarchy available
                </p>
              )}
            </div>
          </section>

          {/* 3. Language Properties */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Language Properties
              </h3>
              {!editingProperties && (
                <button
                  onClick={() => setEditingProperties(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-3'>
              {editingProperties ? (
                <>
                  {localProperties.map((prop, index) => (
                    <div key={index} className='flex gap-2'>
                      <input
                        type='text'
                        placeholder='Key'
                        value={prop.key}
                        onChange={e => {
                          const updated = [...localProperties];
                          updated[index].key = e.target.value;
                          setLocalProperties(updated);
                        }}
                        className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                      <input
                        type='text'
                        placeholder='Value'
                        value={prop.value}
                        onChange={e => {
                          const updated = [...localProperties];
                          updated[index].value = e.target.value;
                          setLocalProperties(updated);
                        }}
                        className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                      <button
                        onClick={() => handleRemoveProperty(index)}
                        className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddProperty}
                    className='w-full px-3 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2'
                  >
                    <Plus className='h-4 w-4' />
                    Add Property
                  </button>
                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => {
                        setEditingProperties(false);
                        if (properties) {
                          setLocalProperties(
                            properties.map(p => ({
                              key: p.key || '',
                              value: p.value || '',
                            }))
                          );
                        }
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updatePropertiesMutation.mutate()}
                      disabled={updatePropertiesMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                    >
                      <Save className='h-4 w-4' />
                      {updatePropertiesMutation.isPending
                        ? 'Saving...'
                        : 'Save'}
                    </button>
                  </div>
                </>
              ) : properties && properties.length > 0 ? (
                properties.map(prop => (
                  <div
                    key={prop.id}
                    className='flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0'
                  >
                    <span className='font-medium text-neutral-700 dark:text-neutral-300'>
                      {prop.key}
                    </span>
                    <span className='text-neutral-600 dark:text-neutral-400'>
                      {prop.value}
                    </span>
                  </div>
                ))
              ) : (
                <p className='text-neutral-500 dark:text-neutral-400'>
                  No properties
                </p>
              )}
            </div>
          </section>

          {/* 4. Alternate Names (Aliases) */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Alternate Names
              </h3>
              {!editingAliases && (
                <button
                  onClick={() => setEditingAliases(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-3'>
              {editingAliases ? (
                <>
                  {localAliases.map((alias, index) => (
                    <div key={index} className='flex gap-2'>
                      <input
                        type='text'
                        placeholder='Alias name'
                        value={alias.alias_name}
                        onChange={e => {
                          const updated = [...localAliases];
                          updated[index].alias_name = e.target.value;
                          setLocalAliases(updated);
                        }}
                        className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                      <button
                        onClick={() => handleRemoveAlias(index)}
                        className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddAlias}
                    className='w-full px-3 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2'
                  >
                    <Plus className='h-4 w-4' />
                    Add Alias
                  </button>
                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => {
                        setEditingAliases(false);
                        if (aliases) {
                          setLocalAliases(
                            aliases.map(a => ({
                              alias_name: a.alias_name || '',
                            }))
                          );
                        }
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateAliasesMutation.mutate()}
                      disabled={updateAliasesMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                    >
                      <Save className='h-4 w-4' />
                      {updateAliasesMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              ) : aliases && aliases.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {aliases.map(alias => (
                    <span
                      key={alias.id}
                      className='px-3 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full text-sm text-neutral-700 dark:text-neutral-300'
                    >
                      {alias.alias_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className='text-neutral-500 dark:text-neutral-400'>
                  No alternate names
                </p>
              )}
            </div>
          </section>

          {/* 5. Regions */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Linked Regions
              </h3>
              {!editingRegions && (
                <button
                  onClick={() => setEditingRegions(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-3'>
              {editingRegions ? (
                <>
                  {/* Search to add regions */}
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                    <input
                      type='text'
                      placeholder='Search regions to add...'
                      value={regionSearchQuery}
                      onChange={e => setRegionSearchQuery(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    />
                  </div>

                  {/* Search results */}
                  {regionSearchQuery &&
                    searchedRegions &&
                    searchedRegions.length > 0 && (
                      <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                        {searchedRegions.map(region => (
                          <button
                            key={region.id}
                            onClick={() => handleToggleRegion(region.id)}
                            className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between ${
                              selectedRegionIds.includes(region.id)
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : ''
                            }`}
                          >
                            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                              {region.name}
                              <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                ({region.level})
                              </span>
                            </span>
                            {selectedRegionIds.includes(region.id) && (
                              <span className='text-primary-600 dark:text-primary-400 text-xs'>
                                ✓ Selected
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                  {/* Selected regions */}
                  <div>
                    <p className='text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                      Selected Regions ({selectedRegionIds.length})
                    </p>
                    <div className='space-y-2 max-h-60 overflow-y-auto'>
                      {fullEntity?.regions
                        ?.filter(r => selectedRegionIds.includes(r.id))
                        .map(region => (
                          <div
                            key={region.id}
                            className='flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700'
                          >
                            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                              {region.name}
                              <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                ({region.level})
                              </span>
                            </span>
                            <button
                              onClick={() => handleToggleRegion(region.id)}
                              className='p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                            >
                              <X className='h-4 w-4' />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => {
                        setEditingRegions(false);
                        setRegionSearchQuery('');
                        if (fullEntity?.regions) {
                          setSelectedRegionIds(
                            fullEntity.regions.map(r => r.id)
                          );
                        }
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateRegionsMutation.mutate()}
                      disabled={updateRegionsMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                    >
                      <Save className='h-4 w-4' />
                      {updateRegionsMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              ) : fullEntity?.regions && fullEntity.regions.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {fullEntity.regions.map(region => (
                    <button
                      key={region.id}
                      onClick={() => {
                        if (onNavigateToRegion) {
                          onNavigateToRegion(region.id);
                        }
                      }}
                      className='p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left'
                    >
                      <p className='font-medium text-neutral-900 dark:text-neutral-100'>
                        {region.name}
                      </p>
                      <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                        {region.level}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className='text-neutral-500 dark:text-neutral-400'>
                  No linked regions
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

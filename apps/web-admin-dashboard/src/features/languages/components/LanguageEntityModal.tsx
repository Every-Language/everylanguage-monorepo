import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { languagesApi } from '../api/languagesApi';
import type { LanguageEntity, LanguageEntityWithRegions } from '@/types';
import { X, Edit, Save, Plus, Trash2, Search } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { LocationPicker } from '@/shared/components/LocationPicker/LocationPicker';
import {
  extractLocation,
  locationToPostGIS,
} from '@/shared/utils/locationUtils';

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
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);

  // Section editing states
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingProperties, setEditingProperties] = useState(false);
  const [editingAliases, setEditingAliases] = useState(false);
  const [editingRegions, setEditingRegions] = useState(false);
  const [editingExternalIds, setEditingExternalIds] = useState(false);
  const [editingHierarchy, setEditingHierarchy] = useState(false);

  // Form states for Language Info
  const [name, setName] = useState(entity.name);
  const [level, setLevel] = useState(entity.level);

  // Hierarchy tree state
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});

  // Parent language editing state
  const [parentLanguageSearch, setParentLanguageSearch] = useState('');
  const [selectedParentLanguageId, setSelectedParentLanguageId] = useState<
    string | null
  >(null);
  const [selectedParentLanguage, setSelectedParentLanguage] =
    useState<LanguageEntity | null>(null);

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

  // Fetch external IDs (sources)
  const { data: sources } = useQuery({
    queryKey: ['language-entity-sources', entity.id],
    queryFn: () => languagesApi.fetchLanguageEntitySources(entity.id),
  });

  // Fetch full region data with location, dominance_level, location_source
  const { data: fullRegionData } = useQuery({
    queryKey: ['language-entity-regions-full', entity.id],
    queryFn: () => languagesApi.fetchLanguageEntityRegions(entity.id),
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
  const [localSources, setLocalSources] = useState<
    Array<{
      id?: string;
      source: string;
      version: string;
      is_external: boolean;
      external_id: string;
      external_id_type: string;
    }>
  >([]);

  // Local state for regions with full junction table data
  type RegionEntry = {
    id: string; // language_entities_regions.id
    region_id: string;
    region: { id: string; name: string; level: string } | null;
    dominance_level: number | null;
    location_source: string;
    location: { lat: number; lng: number } | null;
  };
  const [localRegions, setLocalRegions] = useState<RegionEntry[]>([]);

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

  // Sync local regions with fetched full region data
  useEffect(() => {
    if (fullRegionData) {
      setLocalRegions(
        fullRegionData.map(ler => ({
          id: ler.id,
          region_id: ler.region_id,
          region: ler.region
            ? {
                id: ler.region.id,
                name: ler.region.name,
                level: ler.region.level,
              }
            : null,
          dominance_level: ler.dominance_level ?? null,
          location_source: ler.location_source || '',
          location: extractLocation(ler.location),
        }))
      );
    }
  }, [fullRegionData]);

  // Sync local sources with fetched data
  useEffect(() => {
    if (sources) {
      setLocalSources(
        sources.map(s => ({
          id: s.id,
          source: s.source || '',
          version: s.version || '',
          is_external: s.is_external,
          external_id: s.external_id || '',
          external_id_type: s.external_id_type || '',
        }))
      );
    }
  }, [sources]);

  // Initialize parent language from fullEntity when editing starts
  useEffect(() => {
    if (editingHierarchy && fullEntity) {
      setSelectedParentLanguageId(fullEntity.parent_id || null);
      // Try to find the parent language in hierarchy to set selectedParentLanguage
      if (fullEntity.parent_id && hierarchy) {
        const parentNode = hierarchy.find(
          h => h.hierarchy_entity_id === fullEntity.parent_id
        );
        if (parentNode) {
          setSelectedParentLanguage({
            id: parentNode.hierarchy_entity_id,
            name: parentNode.hierarchy_entity_name,
            level: parentNode.hierarchy_entity_level as
              | 'family'
              | 'language'
              | 'dialect'
              | 'mother_tongue',
            parent_id: parentNode.hierarchy_parent_id,
            created_at: '',
            updated_at: '',
            deleted_at: null,
          });
        }
      }
    }
  }, [editingHierarchy, fullEntity, hierarchy]);

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

  // Search parent languages for hierarchy editing
  const { data: searchedParentLanguages } = useQuery({
    queryKey: ['search-parent-languages', parentLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(parentLanguageSearch),
    enabled: editingHierarchy && parentLanguageSearch.length >= 2,
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
      // Get existing region link IDs
      const existingLinks = fullRegionData || [];
      const existingLinkIds = new Set(existingLinks.map(l => l.id));
      const localLinkIds = new Set(localRegions.map(r => r.id));

      // Find links to delete (exist in DB but not in local state)
      const toDelete = existingLinks.filter(link => !localLinkIds.has(link.id));
      for (const link of toDelete) {
        await languagesApi.deleteLanguageEntityRegion(link.id);
      }

      // Update existing links or create new ones
      for (const localRegion of localRegions) {
        if (localRegion.region_id) {
          if (existingLinkIds.has(localRegion.id)) {
            // Update existing link
            await languagesApi.updateLanguageEntityRegion(localRegion.id, {
              dominance_level: localRegion.dominance_level,
              location: locationToPostGIS(localRegion.location),
              location_source: localRegion.location_source.trim() || null,
            });
          } else {
            // Create new link
            await languagesApi.createLanguageEntityRegion(
              entity.id,
              localRegion.region_id,
              {
                dominance_level: localRegion.dominance_level,
                location: locationToPostGIS(localRegion.location),
                location_source: localRegion.location_source.trim() || null,
              }
            );
          }
        }
      }
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['language-entity-full', entity.id],
      });
      await queryClient.refetchQueries({
        queryKey: ['language-entity-regions-full', entity.id],
      });
      await queryClient.refetchQueries({ queryKey: ['language-entities'] });
      setEditingRegions(false);
      setRegionSearchQuery('');
    },
  });

  const updateExternalIdsMutation = useMutation({
    mutationFn: async () => {
      // Get existing source IDs
      const existingIds = sources?.map(s => s.id) || [];
      const localIds = localSources.filter(s => s.id).map(s => s.id!);

      // Delete sources that were removed
      const toDelete = existingIds.filter(id => !localIds.includes(id));
      for (const id of toDelete) {
        await languagesApi.deleteLanguageEntitySource(id);
      }

      // Update or create sources
      for (const source of localSources.filter(s => s.source.trim())) {
        if (source.id) {
          // Update existing
          await languagesApi.updateLanguageEntitySource(source.id, {
            source: source.source,
            version: source.version || null,
            is_external: source.is_external,
            external_id: source.is_external ? source.external_id || null : null,
            external_id_type: source.is_external
              ? source.external_id_type || null
              : null,
          });
        } else {
          // Create new
          await languagesApi.createLanguageEntitySource(entity.id, {
            source: source.source,
            version: source.version || null,
            is_external: source.is_external,
            external_id: source.is_external ? source.external_id || null : null,
            external_id_type: source.is_external
              ? source.external_id_type || null
              : null,
          });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['language-entity-sources', entity.id],
      });
      setEditingExternalIds(false);
    },
  });

  const updateHierarchyMutation = useMutation({
    mutationFn: async () => {
      await languagesApi.updateLanguageEntity(entity.id, {
        parent_id: selectedParentLanguageId || null,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['language-entities'] });
      queryClient.invalidateQueries({
        queryKey: ['language-entity-full', entity.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['language-hierarchy', entity.id],
      });
      setEditingHierarchy(false);
      setParentLanguageSearch('');
      setSelectedParentLanguageId(null);
      setSelectedParentLanguage(null);
      onSave();
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
      // Remove from local regions
      setLocalRegions(localRegions.filter(r => r.region_id !== regionId));
    } else {
      setSelectedRegionIds([...selectedRegionIds, regionId]);
      // Add to local regions
      const region = searchedRegions?.find(r => r.id === regionId);
      if (region) {
        setLocalRegions([
          ...localRegions,
          {
            id: '', // Will be set when created
            region_id: regionId,
            region: {
              id: region.id,
              name: region.name,
              level: region.level,
            },
            dominance_level: 1.0,
            location_source: '',
            location: null,
          },
        ]);
      }
    }
  };

  const handleUpdateRegion = (
    regionId: string,
    updates: Partial<Omit<RegionEntry, 'id' | 'region_id' | 'region'>>
  ) => {
    setLocalRegions(
      localRegions.map(r =>
        r.region_id === regionId ? { ...r, ...updates } : r
      )
    );
  };

  const handleRemoveRegion = (regionId: string) => {
    setLocalRegions(localRegions.filter(r => r.region_id !== regionId));
    setSelectedRegionIds(selectedRegionIds.filter(id => id !== regionId));
  };

  const handleAddSource = () => {
    setLocalSources([
      ...localSources,
      {
        source: '',
        version: '',
        is_external: false,
        external_id: '',
        external_id_type: '',
      },
    ]);
  };

  const handleRemoveSource = (index: number) => {
    setLocalSources(localSources.filter((_, i) => i !== index));
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
              aria-label={openNodes[nodeId] ? 'Collapse' : 'Expand'}>
              {openNodes[nodeId] ? '▾' : '▸'}
            </button>
          ) : (
            <span className='w-5 h-5' />
          )}
          {editingHierarchy ? (
            <span
              className={`text-sm ${
                isCurrentEntity
                  ? 'text-primary-600 dark:text-primary-500 font-semibold'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}>
              {node.name}
            </span>
          ) : (
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
              }}>
              {node.name}
            </button>
          )}
          <span
            className={`text-xs ${
              isCurrentEntity
                ? 'text-primary-600 dark:text-primary-500'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}>
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
        }`}>
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
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
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
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
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
                {editingInfo ? (
                  <Select
                    label='Level'
                    value={level}
                    onValueChange={value => setLevel(value as typeof level)}>
                    <SelectItem value='family'>Family</SelectItem>
                    <SelectItem value='language'>Language</SelectItem>
                    <SelectItem value='dialect'>Dialect</SelectItem>
                    <SelectItem value='mother_tongue'>Mother Tongue</SelectItem>
                  </Select>
                ) : (
                  <>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Level
                    </label>
                    <p className='text-neutral-900 dark:text-neutral-100'>
                      {entity.level}
                    </p>
                  </>
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
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                    Cancel
                  </button>
                  <button
                    onClick={() => updateInfoMutation.mutate()}
                    disabled={updateInfoMutation.isPending}
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                    <Save className='h-4 w-4' />
                    {updateInfoMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. Language Hierarchy */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Language Hierarchy
              </h3>
              {!editingHierarchy && (
                <button
                  onClick={() => setEditingHierarchy(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-4'>
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

              {editingHierarchy && (
                <>
                  <div className='pt-4 border-t border-neutral-200 dark:border-neutral-700'>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                      Parent Language
                    </label>
                    <div className='space-y-2'>
                      <div className='relative'>
                        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                        <input
                          type='text'
                          placeholder='Search for parent language...'
                          value={parentLanguageSearch}
                          onChange={e =>
                            setParentLanguageSearch(e.target.value)
                          }
                          className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                        />
                      </div>
                      {parentLanguageSearch &&
                        searchedParentLanguages &&
                        searchedParentLanguages.length > 0 && (
                          <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                            {searchedParentLanguages
                              .filter(lang => lang.id !== entity.id) // Don't allow selecting self
                              .map(lang => (
                                <button
                                  key={lang.id}
                                  type='button'
                                  onClick={() => {
                                    setSelectedParentLanguageId(lang.id);
                                    setSelectedParentLanguage(lang);
                                    setParentLanguageSearch('');
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                                    selectedParentLanguageId === lang.id
                                      ? 'bg-primary-50 dark:bg-primary-900/20'
                                      : ''
                                  }`}>
                                  <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                                    {lang.name}
                                    <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                      ({lang.level})
                                    </span>
                                  </span>
                                </button>
                              ))}
                          </div>
                        )}
                      {selectedParentLanguageId && selectedParentLanguage && (
                        <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                          Selected: {selectedParentLanguage.name}
                          <button
                            type='button'
                            onClick={() => {
                              setSelectedParentLanguageId(null);
                              setSelectedParentLanguage(null);
                              setParentLanguageSearch('');
                            }}
                            className='ml-2 text-red-600 dark:text-red-400 hover:underline'>
                            Clear
                          </button>
                        </p>
                      )}
                      {selectedParentLanguageId === null &&
                        fullEntity?.parent_id === null && (
                          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                            No parent language (root level)
                          </p>
                        )}
                    </div>
                  </div>
                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => {
                        setEditingHierarchy(false);
                        setParentLanguageSearch('');
                        setSelectedParentLanguageId(null);
                        setSelectedParentLanguage(null);
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      onClick={() => updateHierarchyMutation.mutate()}
                      disabled={updateHierarchyMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                      <Save className='h-4 w-4' />
                      {updateHierarchyMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
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
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
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
                        className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'>
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddProperty}
                    className='w-full px-3 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2'>
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
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      onClick={() => updatePropertiesMutation.mutate()}
                      disabled={updatePropertiesMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
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
                    className='flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0'>
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

          {/* 4. External IDs */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                External IDs
              </h3>
              {!editingExternalIds && (
                <button
                  onClick={() => setEditingExternalIds(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-3'>
              {editingExternalIds ? (
                <>
                  {localSources.map((source, index) => (
                    <div
                      key={index}
                      className='border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 space-y-2'>
                      <div className='flex gap-2'>
                        <input
                          type='text'
                          placeholder='Source'
                          value={source.source}
                          onChange={e => {
                            const updated = [...localSources];
                            updated[index].source = e.target.value;
                            setLocalSources(updated);
                          }}
                          className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                        />
                        <input
                          type='text'
                          placeholder='Version'
                          value={source.version}
                          onChange={e => {
                            const updated = [...localSources];
                            updated[index].version = e.target.value;
                            setLocalSources(updated);
                          }}
                          className='w-32 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                        />
                        <button
                          onClick={() => handleRemoveSource(index)}
                          className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <label className='flex items-center gap-2 text-sm'>
                          <input
                            type='checkbox'
                            checked={source.is_external}
                            onChange={e => {
                              const updated = [...localSources];
                              updated[index].is_external = e.target.checked;
                              setLocalSources(updated);
                            }}
                            className='rounded'
                          />
                          External ID
                        </label>
                      </div>
                      {source.is_external && (
                        <div className='flex gap-2'>
                          <input
                            type='text'
                            placeholder='External ID Type'
                            value={source.external_id_type}
                            onChange={e => {
                              const updated = [...localSources];
                              updated[index].external_id_type = e.target.value;
                              setLocalSources(updated);
                            }}
                            className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                          />
                          <input
                            type='text'
                            placeholder='External ID'
                            value={source.external_id}
                            onChange={e => {
                              const updated = [...localSources];
                              updated[index].external_id = e.target.value;
                              setLocalSources(updated);
                            }}
                            className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddSource}
                    className='w-full px-3 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2'>
                    <Plus className='h-4 w-4' />
                    Add Source
                  </button>
                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => {
                        setEditingExternalIds(false);
                        if (sources) {
                          setLocalSources(
                            sources.map(s => ({
                              id: s.id,
                              source: s.source || '',
                              version: s.version || '',
                              is_external: s.is_external,
                              external_id: s.external_id || '',
                              external_id_type: s.external_id_type || '',
                            }))
                          );
                        }
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      onClick={() => updateExternalIdsMutation.mutate()}
                      disabled={updateExternalIdsMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                      <Save className='h-4 w-4' />
                      {updateExternalIdsMutation.isPending
                        ? 'Saving...'
                        : 'Save'}
                    </button>
                  </div>
                </>
              ) : sources && sources.length > 0 ? (
                <div className='flex flex-col gap-2'>
                  {sources
                    .filter(s => s.external_id && s.external_id_type)
                    .map(source => (
                      <div
                        key={source.id}
                        className='flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0'>
                        <span className='font-mono text-sm text-neutral-700 dark:text-neutral-300'>
                          {source.external_id_type}:{source.external_id}
                        </span>
                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                          {source.source}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className='text-neutral-500 dark:text-neutral-400'>
                  No external IDs
                </p>
              )}
            </div>
          </section>

          {/* 5. Alternate Names (Aliases) */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Alternate Names
              </h3>
              {!editingAliases && (
                <button
                  onClick={() => setEditingAliases(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
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
                        className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'>
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddAlias}
                    className='w-full px-3 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2'>
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
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      onClick={() => updateAliasesMutation.mutate()}
                      disabled={updateAliasesMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
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
                      className='px-3 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full text-sm text-neutral-700 dark:text-neutral-300'>
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

          {/* 6. Regions */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Linked Regions
              </h3>
              {!editingRegions && (
                <button
                  onClick={() => setEditingRegions(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
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
                            }`}>
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

                  {/* Selected regions with details */}
                  <div>
                    <p className='text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                      Selected Regions ({localRegions.length})
                    </p>
                    <div className='space-y-4'>
                      {localRegions.map(localRegion => (
                        <div
                          key={localRegion.region_id}
                          className='border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 space-y-4 bg-white dark:bg-neutral-800'>
                          <div className='flex items-center justify-between'>
                            <h4 className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                              {localRegion.region?.name || 'Unknown Region'}
                              <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                ({localRegion.region?.level || 'unknown'})
                              </span>
                            </h4>
                            <button
                              onClick={() =>
                                handleRemoveRegion(localRegion.region_id)
                              }
                              className='p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'>
                              <X className='h-4 w-4' />
                            </button>
                          </div>

                          {/* Dominance Level */}
                          <div>
                            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                              Dominance Level
                            </label>
                            <input
                              type='number'
                              min='0'
                              max='1'
                              step='0.1'
                              value={localRegion.dominance_level ?? ''}
                              onChange={e =>
                                handleUpdateRegion(localRegion.region_id, {
                                  dominance_level:
                                    e.target.value === ''
                                      ? null
                                      : parseFloat(e.target.value) || 0,
                                })
                              }
                              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                            />
                          </div>

                          {/* Location Source */}
                          <div>
                            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                              Location Source
                            </label>
                            <input
                              type='text'
                              value={localRegion.location_source}
                              onChange={e =>
                                handleUpdateRegion(localRegion.region_id, {
                                  location_source: e.target.value,
                                })
                              }
                              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                              placeholder='e.g., Manual, GRN'
                            />
                          </div>

                          {/* Location Picker */}
                          <div>
                            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                              Location
                            </label>
                            <LocationPicker
                              location={localRegion.location}
                              onLocationChange={location =>
                                handleUpdateRegion(localRegion.region_id, {
                                  location,
                                })
                              }
                              height='300px'
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => {
                        setEditingRegions(false);
                        setRegionSearchQuery('');
                        // Reset local regions to fetched data
                        if (fullRegionData) {
                          setLocalRegions(
                            fullRegionData.map(ler => ({
                              id: ler.id,
                              region_id: ler.region_id,
                              region: ler.region
                                ? {
                                    id: ler.region.id,
                                    name: ler.region.name,
                                    level: ler.region.level,
                                  }
                                : null,
                              dominance_level: ler.dominance_level ?? null,
                              location_source: ler.location_source || '',
                              location: extractLocation(ler.location),
                            }))
                          );
                        }
                        if (fullEntity?.regions) {
                          setSelectedRegionIds(
                            fullEntity.regions.map(r => r.id)
                          );
                        }
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      onClick={() => updateRegionsMutation.mutate()}
                      disabled={updateRegionsMutation.isPending}
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
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
                      className='p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left'>
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

/\*\*

- BUSINESS LOGIC & UI SEPARATION ARCHITECTURE
-
- This guide demonstrates the separation of business logic from UI components.
- Following this pattern ensures maintainability, testability, and reusability.
  \*/

// ============================================================================
// PATTERN 1: CUSTOM HOOKS (Business Logic Layer)
// ============================================================================

/\*\*

- Custom hooks contain:
- - State management
- - Data fetching
- - Mutations
- - Business logic
- - Derived state/computations
- - Event handlers
-
- Custom hooks should NOT:
- - Render JSX
- - Reference UI libraries
- - Know about styling
- - Make direct DOM manipulations
    \*/

// Example Hook Structure:
/\*
export interface UseAudioFileManagementReturn {
// State
filters: FilterState;
sort: SortState;
selectedItems: Set<string>;
formData: AudioFileEditForm;

// Handlers
handleFilterChange: (key: string, value: unknown) => void;
handleSort: (field: string) => void;
selectItem: (id: string, selected: boolean) => void;

// Data
files: AudioFile[];
totalItems: number;
isLoading: boolean;
error?: Error;

// Operations
updateFile: (id: string, data: Partial<AudioFileEditForm>) => Promise<void>;
deleteFiles: (ids: string[]) => Promise<void>;
}

export function useAudioFileManagement(projectId: string | null): UseAudioFileManagementReturn {
const entity = useEntityManagement<AudioFileEditForm>({...});
const { data: paginatedResult, isLoading } = useEntityFetch({...});
const updateMutation = useEntityMutation({...});
const deleteMutation = useBatchEntityMutation({...});

return {
// Expose only what's needed
filters: entity.filters,
sort: entity.sort,
selectedItems: entity.selectedItems,
// ... etc
};
}
\*/

// ============================================================================
// PATTERN 2: PRESENTATIONAL COMPONENTS (UI Layer)
// ============================================================================

/\*\*

- Presentational (Dumb) Components:
- - Accept props for all data and callbacks
- - No hooks (except styling hooks like useTheme)
- - Pure components (same props = same output)
- - Easy to test (pass props, assert output)
- - Highly reusable
- - Styling/UI is their ONLY concern
    \*/

import React from 'react';

interface AudioFileTableProps {
files: Array<{ id: string; name: string; status: string }>;
selectedFiles: Set<string>;
isLoading: boolean;
sortField: string | null;
sortDirection: 'asc' | 'desc' | null;

// Callbacks - no business logic, just event passing
onSelectFile: (id: string, selected: boolean) => void;
onSelectAll: () => void;
onSort: (field: string) => void;
}

/\*\*

- Pure presentational component
- - No hooks
- - No state
- - Just rendering based on props
    \*/
    export const AudioFileTable: React.FC<AudioFileTableProps> = ({
    files,
    selectedFiles,
    isLoading,
    sortField,
    sortDirection,
    onSelectFile,
    onSelectAll,
    onSort,
    }) => {
    if (isLoading) {
    return <div>Loading...</div>;
    }

return (

<table>
<thead>
<tr>
<th>
<input
type='checkbox'
onChange={e => onSelectAll()}
checked={files.length > 0 && files.every(f => selectedFiles.has(f.id))}
/>
</th>
<th
onClick={() => onSort('name')}
style={{ cursor: 'pointer', fontWeight: sortField === 'name' ? 'bold' : 'normal' }}>
File Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
</th>
<th>Status</th>
</tr>
</thead>
<tbody>
{files.map(file => (
<tr key={file.id}>
<td>
<input
type='checkbox'
checked={selectedFiles.has(file.id)}
onChange={e => onSelectFile(file.id, e.target.checked)}
/>
</td>
<td>{file.name}</td>
<td>{file.status}</td>
</tr>
))}
</tbody>
</table>
);
};

// ============================================================================
// PATTERN 3: CONTAINER COMPONENTS (Smart Components)
// ============================================================================

/\*\*

- Container (Smart) Components:
- - Use custom hooks to get business logic
- - Connect hooks to presentational components
- - Orchestrate data flow
- - Handle side effects
- - Minimal UI rendering
    \*/

interface AudioFileContainerProps {
projectId: string;
}

export const AudioFileContainer: React.FC<AudioFileContainerProps> = ({ projectId }) => {
// Get all business logic from custom hook
const {
files,
selectedItems,
sort,
isLoading,
handleSort,
selectItem,
selectAll,
} = useAudioFileManagement(projectId);

// Pass state and callbacks to presentational component
return (
<AudioFileTable
      files={files}
      selectedFiles={selectedItems}
      isLoading={isLoading}
      sortField={sort.field}
      sortDirection={sort.direction}
      onSelectFile={selectItem}
      onSelectAll={selectAll}
      onSort={handleSort}
    />
);
};

// ============================================================================
// PATTERN 4: PAGE COMPONENTS (Entry Points)
// ============================================================================

/\*\*

- Page components:
- - Are the route entry points
- - Compose multiple containers
- - Handle route-level logic
- - Provide layout
    \*/

import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';

export const AudioFilesPage: React.FC = () => {
const { selectedProject } = useSelectedProject();

if (!selectedProject) {
return <div>Please select a project</div>;
}

return (

<div>
<h1>Audio Files</h1>
<AudioFileContainer projectId={selectedProject.id} />
</div>
);
};

// ============================================================================
// ANTI-PATTERNS TO AVOID
// ============================================================================

/\*\*

- ❌ BAD: Presentational component with hooks and business logic
  \*/
  const BadAudioFileTable = ({ projectId }: { projectId: string }) => {
  // ❌ Hooks in presentational component
  const { files, selectedItems, selectItem } = useAudioFileManagement(projectId);
  const { toast } = useToast();

const handleSelectChange = (id: string) => {
// ❌ Business logic in component
selectItem(id, !selectedItems.has(id));
toast.success('File selected');
};

// ❌ Complex JSX mixed with logic
return (

<div>
{files.map(file => (
<div
key={file.id}
onClick={() => {
// ❌ Inline complex logic
if (selectedItems.has(file.id)) {
selectItem(file.id, false);
} else {
selectItem(file.id, true);
}
// ❌ Side effect in render
fetch(`/api/files/${file.id}`);
}}>
{file.name}
</div>
))}
</div>
);
};

/\*\*

- ❌ BAD: Custom hook that renders JSX
  \*/
  const BadUseAudioFileManagement = () => {
  const [files, setFiles] = React.useState([]);

// ❌ Rendering in hook!
return (

<div>
{files.map(f => (
<div key={f.id}>{f.name}</div>
))}
</div>
);
};

/\*\*

- ❌ BAD: Container component with too much UI logic
  \*/
  const BadAudioFileContainer = ({ projectId }: { projectId: string }) => {
  const { files, selectedItems, selectItem } = useAudioFileManagement(projectId);
  const [expanded, setExpanded] = React.useState(false);
  const [theme, setTheme] = React.useState('light');

// ❌ UI concerns mixed with business logic container
return (

<div className={theme === 'dark' ? 'dark-mode' : 'light-mode'}>
<button onClick={() => setExpanded(!expanded)}>
{expanded ? 'Collapse' : 'Expand'}
</button>
{expanded && (
<table>
{/_ ❌ Full UI implementation in container _/}
{files.map(file => (
<tr key={file.id}>
<td>
<input
type='checkbox'
checked={selectedItems.has(file.id)}
onChange={e => selectItem(file.id, e.target.checked)}
/>
</td>
<td>{file.name}</td>
</tr>
))}
</table>
)}
</div>
);
};

// ============================================================================
// GOOD PATTERNS
// ============================================================================

/\*\*

- ✅ GOOD: Custom hook - pure business logic
  \*/
  export const useAudioFileLogic = (projectId: string) => {
  const entity = useEntityManagement<AudioFileEditForm>({...});
  const { data } = useEntityFetch({...});
  const mutation = useEntityMutation({...});

// Business logic: compute derived state
const totalSize = React.useMemo(
() => data?.data.reduce((sum, f) => sum + (f.size || 0), 0) || 0,
[data]
);

// Business logic: handle complex operations
const handleBulkDelete = React.useCallback(async () => {
const ids = Array.from(entity.selectedItems);
await mutation.mutateAsync({ action: 'delete', ids });
entity.clearSelection();
}, [entity, mutation]);

return {
files: data?.data || [],
filters: entity.filters,
selectedItems: entity.selectedItems,
totalSize,
handleBulkDelete,
};
};

/\*\*

- ✅ GOOD: Presentational component - pure UI
  \*/
  interface AudioFileTableProps {
  files: AudioFile[];
  selectedFiles: Set<string>;
  sortField: string | null;
  onSelectFile: (id: string, selected: boolean) => void;
  onSort: (field: string) => void;
  }

const AudioFileTableUI: React.FC<AudioFileTableProps> = ({
files,
selectedFiles,
sortField,
onSelectFile,
onSort,
}) => {
return (

<table className='...'>
<thead>
<tr>
<th onClick={() => onSort('name')}>
File Name {sortField === 'name' && '↑'}
</th>
</tr>
</thead>
<tbody>
{files.map(file => (
<tr key={file.id}>
<td>
<input
checked={selectedFiles.has(file.id)}
onChange={e => onSelectFile(file.id, e.target.checked)}
/>
</td>
<td>{file.name}</td>
</tr>
))}
</tbody>
</table>
);
};

/\*\*

- ✅ GOOD: Container component - orchestration
  \*/
  const AudioFileContainerGood: React.FC<{ projectId: string }> = ({ projectId }) => {
  const {
  files,
  filters,
  selectedItems,
  handleBulkDelete,
  } = useAudioFileLogic(projectId);

return (
<>
<AudioFileTableUI
files={files}
selectedFiles={selectedItems}
sortField={filters.sortField as string | null}
onSelectFile={(id, selected) => {
// Delegate to logic layer
// (ideally in hook, but shown here for clarity)
}}
onSort={(field) => {
// Delegate to logic layer
}}
/>
{selectedItems.size > 0 && (
<button onClick={handleBulkDelete}>Delete {selectedItems.size} files</button>
)}
</>
);
};

// ============================================================================
// SUMMARY
// ============================================================================

/\*
LAYER STRUCTURE:

┌─────────────────────────────────────────┐
│ Page Component (Route Entry) │
│ - Import container │
│ - Handle route params │
│ - Provide layout │
└──────────────┬──────────────────────────┘
│
┌──────────────▼──────────────────────────┐
│ Container Component (Smart) │
│ - Use custom hooks │
│ - Orchestrate data flow │
│ - Minimal UI logic │
│ - Connect to presentational │
└──────────────┬──────────────────────────┘
│
┌──────────────▼──────────────────────────┐
│ Presentational Component (Dumb) │
│ - Pure UI rendering │
│ - Accept props for data/callbacks │
│ - No business logic │
│ - Highly reusable │
└─────────────────────────────────────────┘
▲
│
┌──────────────┴──────────────────────────┐
│ Custom Hook (Business Logic) │
│ - State management (useState) │
│ - Data fetching (useQuery) │
│ - Mutations (useMutation) │
│ - Business logic (derived state) │
│ - Event handlers │
│ - NO RENDERING │
└─────────────────────────────────────────┘

BENEFITS:

1. Testability
   - Hooks: Test logic without mocking React
   - Components: Test rendering with props
   - Easy unit and integration tests

2. Reusability
   - Same hook used by multiple UI variants
   - Presentational components reused everywhere
   - Logic decoupled from presentation

3. Maintainability
   - Clear separation of concerns
   - Changes to UI don't affect logic
   - Changes to logic don't require UI updates

4. Performance
   - Easier to memoize
   - Easier to optimize renders
   - Easier to track dependencies

5. Collaboration
   - Backend devs can work on hooks
   - UI/Design devs work on components
   - Less merge conflicts
     \*/

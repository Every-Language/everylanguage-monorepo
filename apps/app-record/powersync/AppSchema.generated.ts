import { column, Schema, Table } from '@powersync/react-native';
// Alternative: import { column, Schema, Table } from '@powersync/web';

// NOTE: This schema was manually created based on sync-rules.yaml
// It should be regenerated using: pnpm powersync:generate-schema
// when PowerSync credentials (PROJECT_ID, AUTH_TOKEN, ORG_ID) are available

const user_projects = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    project_id: column.text,
    role_id: column.text,
    role_key: column.text,
    role_name: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_0: ['user_id'],
      idx_1: ['project_id'],
      idx_2: ['role_id'],
    },
  }
);

const projects = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    created_by: column.text,
    deleted_at: column.text,
    description: column.text,
    location: column.text,
    name: column.text,
    project_status: column.text,
    publish_status: column.text,
    region_id: column.text,
    region_name: column.text,
    source_language_entity_id: column.text,
    source_language_name: column.text,
    target_language_entity_id: column.text,
    target_language_name: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_0: ['project_status'],
      idx_1: ['publish_status'],
    },
  }
);

const sequences = new Table(
  {
    // id column (text) is automatically included
    book_id: column.text,
    chapter_id: column.text,
    check_status: column.text,
    created_at: column.text,
    created_by: column.text,
    deleted_at: column.text,
    description: column.text,
    end_verse_id: column.text,
    is_bible_audio: column.integer,
    name: column.text,
    project_id: column.text,
    publish_status: column.text,
    start_verse_id: column.text,
    updated_at: column.text,
    upload_status: column.text,
  },
  {
    indexes: {
      idx_0: ['project_id'],
      idx_1: ['book_id'],
      idx_2: ['chapter_id'],
    },
  }
);

const sequences_segments = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    created_by: column.text,
    is_deleted: column.integer,
    is_hidden: column.integer,
    is_numbered: column.integer,
    project_id: column.text,
    segment_color: column.text,
    segment_id: column.text,
    segment_index: column.integer,
    sequence_id: column.text,
    updated_at: column.text,
    verse_number: column.integer,
  },
  {
    indexes: {
      idx_0: ['project_id'],
      idx_1: ['sequence_id'],
      idx_2: ['segment_id'],
    },
  }
);

const segments = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    created_by: column.text,
    deleted_at: column.text,
    local_path: column.text,
    project_id: column.text,
    remote_path: column.text,
    type: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_0: ['project_id'],
      idx_1: ['type'],
    },
  }
);

const sequences_tags = new Table(
  {
    // id column (text) is automatically included
    sequence_id: column.text,
    tag_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_0: ['sequence_id'],
      idx_1: ['tag_id'],
    },
  }
);

const sequences_targets = new Table(
  {
    // id column (text) is automatically included
    sequence_id: column.text,
    target_id: column.text,
    target_type: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_0: ['sequence_id'],
      idx_1: ['target_id', 'target_type'],
    },
  }
);

const segments_targets = new Table(
  {
    // id column (text) is automatically included
    segment_id: column.text,
    target_id: column.text,
    target_type: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_0: ['segment_id'],
      idx_1: ['target_id', 'target_type'],
    },
  }
);

export const SyncedSchema = new Schema({
  user_projects,
  projects,
  sequences,
  sequences_segments,
  segments,
  sequences_tags,
  sequences_targets,
  segments_targets,
});

export const AppSchema = new Schema({
  user_projects,
  projects,
  sequences,
  sequences_segments,
  segments,
  sequences_tags,
  sequences_targets,
  segments_targets,
});

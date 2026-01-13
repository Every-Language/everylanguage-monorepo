import { column, Schema, Table } from '@powersync/react-native';
// Alternative: import { column, Schema, Table } from '@powersync/web';
const bible_versions = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    structure_notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const books = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    book_number: column.integer,
    bible_version_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    global_order: column.integer,
    testament: column.text,
  },
  { indexes: {} }
);
const chapters = new Table(
  {
    // id column (text) is automatically included
    chapter_number: column.integer,
    book_id: column.text,
    total_verses: column.integer,
    created_at: column.text,
    updated_at: column.text,
    global_order: column.integer,
  },
  { indexes: {} }
);
const verses = new Table(
  {
    // id column (text) is automatically included
    chapter_id: column.text,
    verse_number: column.integer,
    created_at: column.text,
    updated_at: column.text,
    global_order: column.integer,
  },
  { indexes: {} }
);
const projects = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    description: column.text,
    source_language_entity_id: column.text,
    target_language_entity_id: column.text,
    region_id: column.text,
    location: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    created_by: column.text,
    project_status: column.text,
    region_name: column.text,
    source_language_name: column.text,
    target_language_name: column.text,
    publish_status: column.text,
  },
  { indexes: {} }
);
const sequences = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    description: column.text,
    book_id: column.text,
    is_bible_audio: column.integer,
    start_verse_id: column.text,
    end_verse_id: column.text,
    project_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    created_by: column.text,
    upload_status: column.text,
    publish_status: column.text,
    check_status: column.text,
    chapter_id: column.text,
  },
  { indexes: {} }
);
const segments = new Table(
  {
    // id column (text) is automatically included
    type: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    project_id: column.text,
    sequence_id: column.text,
    segment_index: column.integer,
    segment_color: column.text,
    is_deleted: column.integer,
    is_numbered: column.integer,
    storage_provider: column.text,
    object_key: column.text,
    original_filename: column.text,
    file_type: column.text,
  },
  { indexes: {} }
);
const audio_versions = new Table(
  {
    // id column (text) is automatically included
    language_entity_id: column.text,
    bible_version_id: column.text,
    project_id: column.text,
    name: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    publish_status: column.text,
  },
  { indexes: {} }
);
const media_files = new Table(
  {
    // id column (text) is automatically included
    language_entity_id: column.text,
    media_type: column.text,
    file_size: column.integer,
    duration_seconds: column.real,
    upload_status: column.text,
    publish_status: column.text,
    check_status: column.text,
    version: column.integer,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    is_bible_audio: column.integer,
    start_verse_id: column.text,
    end_verse_id: column.text,
    audio_version_id: column.text,
    chapter_id: column.text,
    object_key: column.text,
    storage_provider: column.text,
    original_filename: column.text,
    file_type: column.text,
    sequence_id: column.text,
    project_id: column.text,
  },
  { indexes: {} }
);
const media_files_verses = new Table(
  {
    // id column (text) is automatically included
    media_file_id: column.text,
    verse_id: column.text,
    start_time_seconds: column.real,
    duration_seconds: column.real,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    denormalized_audio_version_id: column.text,
    verse_checker_status: column.text,
    verse_checker_comment: column.text,
    project_id: column.text,
  },
  { indexes: {} }
);
export const AppSchema = new Schema({
  bible_versions,
  books,
  chapters,
  verses,
  projects,
  sequences,
  segments,
  audio_versions,
  media_files,
  media_files_verses,
});

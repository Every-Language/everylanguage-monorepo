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
const sessions = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    started_at: column.text,
    ended_at: column.text,
    connectivity: column.text,
    location: column.text,
    platform: column.text,
    app_version: column.text,
    os: column.text,
    os_version: column.text,
    app_download_id: column.text,
    location_source: column.text,
    continent_code: column.text,
    country_code: column.text,
    region_code: column.text,
  },
  { indexes: {} }
);
const share_opens = new Table(
  {
    // id column (text) is automatically included
    share_id: column.text,
    user_id: column.text,
    session_id: column.text,
    opened_at: column.text,
    origin_share_id: column.text,
    created_at: column.text,
  },
  { indexes: {} }
);
const shares = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    session_id: column.text,
    shared_at: column.text,
    share_entity_type: column.text,
    share_entity_id: column.text,
    language_entity_id: column.text,
    origin_share_id: column.text,
  },
  { indexes: {} }
);
const verse_listens = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    session_id: column.text,
    verse_id: column.text,
    language_entity_id: column.text,
    listened_at: column.text,
    origin_share_id: column.text,
  },
  { indexes: {} }
);
const media_file_listens = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    session_id: column.text,
    media_file_id: column.text,
    language_entity_id: column.text,
    position_seconds: column.real,
    duration_seconds: column.real,
    listened_at: column.text,
    origin_share_id: column.text,
  },
  { indexes: {} }
);
const app_downloads = new Table(
  {
    // id column (text) is automatically included
    origin_share_id: column.text,
    user_id: column.text,
    device_id: column.text,
    downloaded_at: column.text,
    location: column.text,
    app_version: column.text,
    platform: column.text,
    os: column.text,
    os_version: column.text,
  },
  { indexes: {} }
);
const chapter_listens = new Table(
  {
    // id column (text) is automatically included
    session_id: column.text,
    chapter_id: column.text,
    language_entity_id: column.text,
    listened_at: column.text,
    user_id: column.text,
    origin_share_id: column.text,
  },
  { indexes: {} }
);
const user_current_selections = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    selected_audio_version: column.text,
    selected_text_version: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const user_saved_text_versions = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    text_version_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const user_saved_audio_versions = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    audio_version_id: column.text,
    created_at: column.text,
    updated_at: column.text,
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
  },
  { indexes: {} }
);
const text_versions = new Table(
  {
    // id column (text) is automatically included
    language_entity_id: column.text,
    bible_version_id: column.text,
    name: column.text,
    text_version_source: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    project_id: column.text,
  },
  { indexes: {} }
);
const verse_texts = new Table(
  {
    // id column (text) is automatically included
    verse_id: column.text,
    text_version_id: column.text,
    verse_text: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    version: column.integer,
    publish_status: column.text,
  },
  { indexes: {} }
);
const user_bookmarks = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    bookmark_folder_id: column.text,
    note: column.text,
    color: column.text,
    created_at: column.text,
    updated_at: column.text,
    bookmark_type: column.text,
    start_verse_id: column.text,
    end_verse_id: column.text,
  },
  { indexes: {} }
);
const user_bookmark_folders = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    parent_folder_id: column.text,
    name: column.text,
    color: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const user_saved_image_sets = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    set_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const image_sets = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const images = new Table(
  {
    // id column (text) is automatically included
    target_type: column.text,
    target_id: column.text,
    set_id: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    deleted_at: column.text,
    version: column.integer,
    publish_status: column.text,
    object_key: column.text,
    storage_provider: column.text,
    original_filename: column.text,
    file_type: column.text,
  },
  { indexes: {} }
);
const user_playlist_groups = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    name: column.text,
    description: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const user_playlists = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    playlist_id: column.text,
    user_playlist_group_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} }
);
const playlists = new Table(
  {
    // id column (text) is automatically included
    title: column.text,
    description: column.text,
    created_at: column.text,
    created_by: column.text,
    updated_at: column.text,
    image_id: column.text,
  },
  { indexes: {} }
);
const playlist_items = new Table(
  {
    // id column (text) is automatically included
    playlist_id: column.text,
    order_index: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
    playlist_item_type: column.text,
    start_verse_id: column.text,
    end_verse_id: column.text,
    custom_text: column.text,
  },
  { indexes: {} }
);
export const AppSchema = new Schema({
  bible_versions,
  books,
  chapters,
  verses,
  sessions,
  share_opens,
  shares,
  verse_listens,
  media_file_listens,
  app_downloads,
  chapter_listens,
  user_current_selections,
  user_saved_text_versions,
  user_saved_audio_versions,
  audio_versions,
  media_files,
  media_files_verses,
  text_versions,
  verse_texts,
  user_bookmarks,
  user_bookmark_folders,
  user_saved_image_sets,
  image_sets,
  images,
  user_playlist_groups,
  user_playlists,
  playlists,
  playlist_items,
});

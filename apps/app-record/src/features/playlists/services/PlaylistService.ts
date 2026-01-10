import { logger } from '@/shared/utils/logger';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { resolveTargetUserId } from '@/shared/services/auth/OfflineIdentity';
import type { PlaylistFormData } from '../types';
import { generateUUID } from '@/shared/utils/uuid';
import { supabase } from '@/shared/services/api/supabase';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Service class for playlist operations
 * Follows PowerSync database patterns for offline-first development
 */
export class PlaylistService {
  private static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
  /**
   * Create a new playlist
   */
  static async create(playlist: PlaylistFormData) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Creating playlist:',
      playlist
    );

    try {
      const playlistId = generateUUID();
      const now = this.getCurrentTimestamp();
      const session = await supabase.auth.getSession();
      const sessionUserId = session?.data?.session?.user?.id ?? null;
      const userId = await resolveTargetUserId(sessionUserId);

      // Perform both inserts with granular error logs
      try {
        await powerSyncSystem.execute(
          `INSERT INTO playlists (
            id, title, description, created_at, updated_at, created_by, image_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            playlistId,
            playlist.title,
            playlist.description || null,
            now,
            now,
            userId,
            null, // image_id
          ]
        );
      } catch (e) {
        logger.error(
          ENABLE_LOGGING,
          '[PlaylistService] INSERT playlists failed',
          e
        );
        throw e;
      }

      try {
        const userPlaylistId = generateUUID();
        await powerSyncSystem.execute(
          `INSERT INTO user_playlists (
            id, user_id, playlist_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [userPlaylistId, userId, playlistId, now, now]
        );
      } catch (e) {
        logger.error(
          ENABLE_LOGGING,
          '[PlaylistService] INSERT user_playlists failed',
          e
        );
        throw e;
      }

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Playlist created successfully:',
        playlistId
      );

      return {
        id: playlistId,
        title: playlist.title,
        description: playlist.description || null,
        created_at: now,
        updated_at: now,
        created_by: userId,
        image_id: null,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to create playlist:',
        error
      );
      throw new Error('Failed to create playlist. Please try again.');
    }
  }

  /**
   * Edit an existing playlist
   */
  static async edit(playlistId: string, updates: Partial<PlaylistFormData>) {
    logger.info(ENABLE_LOGGING, '[PlaylistService] Editing playlist:', {
      playlistId,
      updates,
    });

    try {
      // Verify playlist exists
      const playlistResult = await powerSyncSystem.get(
        'SELECT id FROM playlists WHERE id = ?',
        [playlistId]
      );

      if (!playlistResult) {
        throw new Error('Playlist not found');
      }

      const now = this.getCurrentTimestamp();
      const updateFields = [];
      const updateValues = [];

      // Build dynamic update query
      if (updates.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(updates.title);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }

      if (updateFields.length === 0) {
        logger.warn(ENABLE_LOGGING, '[PlaylistService] No fields to update');
        return;
      }

      updateFields.push('updated_at = ?');
      updateValues.push(now, playlistId);

      await powerSyncSystem.execute(
        `UPDATE playlists SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Playlist updated successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to edit playlist:',
        error
      );
      throw new Error('Failed to update playlist. Please try again.');
    }
  }

  /**
   * Delete a playlist
   */
  static async delete(playlistId: string) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Deleting playlist:',
      playlistId
    );

    try {
      // Verify playlist exists
      const playlistResult = await powerSyncSystem.get(
        'SELECT id FROM playlists WHERE id = ?',
        [playlistId]
      );

      if (!playlistResult) {
        throw new Error('Playlist not found');
      }

      // Delete playlist and all its items
      // Delete all playlist items first
      await powerSyncSystem.execute(
        'DELETE FROM playlist_items WHERE playlist_id = ?',
        [playlistId]
      );

      // Delete user_playlists entry
      await powerSyncSystem.execute(
        'DELETE FROM user_playlists WHERE playlist_id = ?',
        [playlistId]
      );

      // Delete the playlist
      await powerSyncSystem.execute('DELETE FROM playlists WHERE id = ?', [
        playlistId,
      ]);

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Playlist deleted successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to delete playlist:',
        error
      );
      throw new Error('Failed to delete playlist. Please try again.');
    }
  }

  /**
   * Add a chapter to a playlist
   */
  static async addToPlaylist(playlistId: string, chapterId: string) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Adding chapter to playlist:',
      {
        playlistId,
        chapterId,
      }
    );

    try {
      // Verify playlist exists
      const playlistResult = await powerSyncSystem.get(
        'SELECT id FROM playlists WHERE id = ?',
        [playlistId]
      );

      if (!playlistResult) {
        throw new Error('Playlist not found');
      }

      // Verify chapter exists and get total verses
      const chapterResult = await powerSyncSystem.execute(
        'SELECT id, total_verses FROM chapters WHERE id = ?',
        [chapterId]
      );

      if (chapterResult?.rows?.length === 0) {
        throw new Error('Chapter not found');
      }

      const chapter = chapterResult.rows.item(0) as {
        id: string;
        total_verses: number;
      };

      // Calculate start and end verse IDs for the entire chapter
      const startVerseId = `${chapterId}-1`;
      const endVerseId = `${chapterId}-${chapter.total_verses}`;

      // Check if chapter already exists in playlist
      const existingItemResult = await powerSyncSystem.execute(
        'SELECT id FROM playlist_items WHERE playlist_id = ? AND start_verse_id = ? AND end_verse_id = ?',
        [playlistId, startVerseId, endVerseId]
      );

      if ((existingItemResult?.rows?.length ?? 0) > 0) {
        throw new Error('Chapter already exists in this playlist');
      }

      // Get the next order index
      const orderResult = await powerSyncSystem.execute(
        'SELECT MAX(order_index) as max_order FROM playlist_items WHERE playlist_id = ?',
        [playlistId]
      );
      const maxOrderRow = orderResult?.rows?.item(0) as {
        max_order: number;
      } | null;
      const maxOrder = maxOrderRow?.max_order ?? -1;
      const nextOrderIndex = maxOrder + 1;

      // Generate unique ID and get user ID
      const itemId = generateUUID();
      const now = this.getCurrentTimestamp();
      const session = await supabase.auth.getSession();
      const sessionUserId = session?.data?.session?.user?.id ?? null;
      const userId = await resolveTargetUserId(sessionUserId);

      // Insert the new playlist item into PowerSync
      await powerSyncSystem.execute(
        `INSERT INTO playlist_items (
          id, playlist_id, playlist_item_type, start_verse_id, end_verse_id, 
          custom_text, order_index, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          playlistId,
          'passage',
          startVerseId,
          endVerseId,
          null, // custom_text
          nextOrderIndex,
          now,
          now,
          userId,
        ]
      );

      // Update playlist timestamp
      await powerSyncSystem.execute(
        'UPDATE playlists SET updated_at = ? WHERE id = ?',
        [now, playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Chapter added to playlist successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to add chapter to playlist:',
        error
      );
      throw new Error('Failed to add chapter to playlist. Please try again.');
    }
  }

  /**
   * Add a verse range to a playlist
   */
  static async addVerseRangeToPlaylist(
    playlistId: string,
    startVerseId: string,
    endVerseId: string
  ) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Adding verse range to playlist:',
      {
        playlistId,
        startVerseId,
        endVerseId,
      }
    );

    try {
      // Verify playlist exists
      const playlistResult = await powerSyncSystem.get(
        'SELECT id FROM playlists WHERE id = ?',
        [playlistId]
      );

      if (!playlistResult) {
        throw new Error('Playlist not found');
      }

      // Verify start verse exists
      const startVerseResult = await powerSyncSystem.execute(
        'SELECT id FROM verses WHERE id = ?',
        [startVerseId]
      );

      if (startVerseResult?.rows?.length === 0) {
        throw new Error('Start verse not found');
      }

      // Verify end verse exists
      const endVerseResult = await powerSyncSystem.execute(
        'SELECT id FROM verses WHERE id = ?',
        [endVerseId]
      );

      if (endVerseResult?.rows?.length === 0) {
        throw new Error('End verse not found');
      }

      // Check if verse range already exists in playlist
      const existingItemResult = await powerSyncSystem.execute(
        'SELECT id FROM playlist_items WHERE playlist_id = ? AND start_verse_id = ? AND end_verse_id = ?',
        [playlistId, startVerseId, endVerseId]
      );

      if ((existingItemResult?.rows?.length ?? 0) > 0) {
        throw new Error('Verse range already exists in this playlist');
      }

      // Get the next order index
      const orderResult = await powerSyncSystem.execute(
        'SELECT MAX(order_index) as max_order FROM playlist_items WHERE playlist_id = ?',
        [playlistId]
      );
      const maxOrderRow = orderResult?.rows?.item(0) as {
        max_order: number;
      } | null;
      const maxOrder = maxOrderRow?.max_order ?? -1;
      const nextOrderIndex = maxOrder + 1;

      // Generate unique ID and get user ID
      const itemId = generateUUID();
      const now = this.getCurrentTimestamp();
      const session = await supabase.auth.getSession();
      const sessionUserId = session?.data?.session?.user?.id ?? null;
      const userId = await resolveTargetUserId(sessionUserId);

      // Insert the new playlist item into PowerSync
      await powerSyncSystem.execute(
        `INSERT INTO playlist_items (
          id, playlist_id, playlist_item_type, start_verse_id, end_verse_id, 
          custom_text, order_index, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          playlistId,
          'passage',
          startVerseId,
          endVerseId,
          null, // custom_text
          nextOrderIndex,
          now,
          now,
          userId,
        ]
      );

      // Update playlist timestamp
      await powerSyncSystem.execute(
        'UPDATE playlists SET updated_at = ? WHERE id = ?',
        [now, playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Verse range added to playlist successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to add verse range to playlist:',
        error
      );
      throw new Error(
        'Failed to add verse range to playlist. Please try again.'
      );
    }
  }

  /**
   * Add custom text to a playlist
   */
  static async addCustomText(playlistId: string, customText: string) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Adding custom text to playlist:',
      {
        playlistId,
        customText,
      }
    );

    try {
      // Verify playlist exists
      const playlistResult = await powerSyncSystem.get(
        'SELECT id FROM playlists WHERE id = ?',
        [playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Playlist verification result:',
        {
          playlistId,
          found: !!playlistResult,
        }
      );

      if (!playlistResult) {
        // Let's also check if there are any playlists at all
        const allPlaylistsResult = await powerSyncSystem.getAll(
          'SELECT id, title FROM playlists LIMIT 5'
        );
        logger.info(
          ENABLE_LOGGING,
          '[PlaylistService] Available playlists:',
          allPlaylistsResult || []
        );
        throw new Error(`Playlist not found: ${playlistId}`);
      }

      // Get the next order index
      const orderResult = await powerSyncSystem.execute(
        'SELECT MAX(order_index) as max_order FROM playlist_items WHERE playlist_id = ?',
        [playlistId]
      );
      const maxOrderRow = orderResult?.rows?.item(0) as {
        max_order: number;
      } | null;
      const maxOrder = maxOrderRow?.max_order ?? -1;
      const nextOrderIndex = maxOrder + 1;

      // Generate unique ID and get user ID
      const itemId = generateUUID();
      const now = this.getCurrentTimestamp();
      const session = await supabase.auth.getSession();
      const sessionUserId = session?.data?.session?.user?.id ?? null;
      const userId = await resolveTargetUserId(sessionUserId);

      // Insert the new playlist item into PowerSync
      await powerSyncSystem.execute(
        `INSERT INTO playlist_items (
          id, playlist_id, playlist_item_type, start_verse_id, end_verse_id, 
          custom_text, order_index, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          playlistId,
          'custom_text',
          null,
          null,
          customText,
          nextOrderIndex,
          now,
          now,
          userId,
        ]
      );

      // Update playlist timestamp
      await powerSyncSystem.execute(
        'UPDATE playlists SET updated_at = ? WHERE id = ?',
        [now, playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Custom text added to playlist successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to add custom text to playlist:',
        error
      );
      throw new Error(
        'Failed to add custom text to playlist. Please try again.'
      );
    }
  }

  /**
   * Reorder playlist items
   */
  static async reorderPlaylistItems(
    playlistId: string,
    itemsWithNewOrder: Array<{ id: string; order_index: number }>
  ) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Reordering playlist items:',
      {
        playlistId,
        itemCount: itemsWithNewOrder.length,
        items: itemsWithNewOrder,
      }
    );

    try {
      // Verify playlist exists
      const playlistResult = await powerSyncSystem.get(
        'SELECT id FROM playlists WHERE id = ?',
        [playlistId]
      );

      if (!playlistResult) {
        throw new Error('Playlist not found');
      }

      // Validate input data
      this.validateReorderInput(itemsWithNewOrder);

      const now = this.getCurrentTimestamp();

      // Update all items
      // First, verify all items exist and belong to the playlist
      const existingItems = await powerSyncSystem.execute(
        'SELECT id, order_index FROM playlist_items WHERE playlist_id = ? ORDER BY order_index',
        [playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Existing items query result:',
        {
          hasRows: !!existingItems?.rows,
          rowsType: typeof existingItems?.rows,
          rowsLength: existingItems?.rows?.length,
          rowsConstructor: existingItems?.rows?.constructor?.name,
        }
      );

      // Convert rows to array safely
      let rowsArray: { id: string; order_index: number }[] = [];
      if (existingItems?.rows) {
        try {
          // PowerSync rows are typically accessed by index
          const rowsLength = existingItems.rows.length;
          logger.info(
            ENABLE_LOGGING,
            '[PlaylistService] Rows length:',
            rowsLength
          );

          for (let i = 0; i < rowsLength; i++) {
            const row = existingItems.rows.item(i);
            if (row && row.id && row.order_index !== undefined) {
              rowsArray.push({
                id: String(row.id),
                order_index: Number(row.order_index),
              });
            }
          }

          logger.info(
            ENABLE_LOGGING,
            '[PlaylistService] Processed rows array:',
            {
              length: rowsArray.length,
              items: rowsArray,
            }
          );
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            '[PlaylistService] Failed to convert rows to array:',
            error
          );
        }
      }

      const existingItemIds = new Set(rowsArray.map(row => row.id));

      // Filter out non-existent items and log warnings
      const validItems = itemsWithNewOrder.filter(item => {
        if (!existingItemIds.has(item.id)) {
          logger.warn(
            ENABLE_LOGGING,
            '[PlaylistService] Item not found for reorder:',
            { itemId: item.id, playlistId }
          );
          return false;
        }
        return true;
      });

      if (validItems.length === 0) {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistService] No valid items to reorder'
        );
        return;
      }

      // Strategy: First set all items to temporary negative indices to avoid conflicts
      // Then set them to their final indices
      const tempOffset = -1000000; // Large negative number to avoid conflicts

      // Step 1: Set all items to temporary indices
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        if (!item) continue;
        await powerSyncSystem.execute(
          'UPDATE playlist_items SET order_index = ?, updated_at = ? WHERE id = ? AND playlist_id = ?',
          [tempOffset + i, now, item.id, playlistId]
        );
      }

      // Step 2: Set all items to their final indices
      for (const item of validItems) {
        logger.info(ENABLE_LOGGING, '[PlaylistService] Setting final order:', {
          itemId: item.id,
          finalOrderIndex: item.order_index,
          playlistId,
        });

        await powerSyncSystem.execute(
          'UPDATE playlist_items SET order_index = ?, updated_at = ? WHERE id = ? AND playlist_id = ?',
          [item.order_index, now, item.id, playlistId]
        );
      }

      // Update playlist timestamp
      await powerSyncSystem.execute(
        'UPDATE playlists SET updated_at = ? WHERE id = ?',
        [now, playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Playlist items reordered successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to reorder playlist items:',
        error
      );
      throw new Error('Failed to reorder playlist items. Please try again.');
    }
  }

  /**
   * Validate reorder input data
   */
  private static validateReorderInput(
    itemsWithNewOrder: Array<{ id: string; order_index: number }>
  ) {
    if (!itemsWithNewOrder || itemsWithNewOrder.length === 0) {
      throw new Error('No items provided for reordering');
    }

    // Check for duplicate IDs
    const ids = itemsWithNewOrder.map(item => item.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new Error('Duplicate item IDs found in reorder request');
    }

    // Check for duplicate order indices
    const orderIndices = itemsWithNewOrder.map(item => item.order_index);
    const uniqueOrderIndices = new Set(orderIndices);
    if (orderIndices.length !== uniqueOrderIndices.size) {
      throw new Error('Duplicate order indices found in reorder request');
    }

    // Check for negative order indices
    const hasNegativeIndices = orderIndices.some(index => index < 0);
    if (hasNegativeIndices) {
      throw new Error('Negative order indices are not allowed');
    }
  }

  /**
   * Delete a playlist item
   */
  static async deletePlaylistItem(playlistItemId: string) {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistService] Deleting playlist item:',
      playlistItemId
    );

    try {
      // Find the playlist containing this item
      const itemResult = await powerSyncSystem.execute(
        'SELECT playlist_id FROM playlist_items WHERE id = ?',
        [playlistItemId]
      );

      if (itemResult?.rows?.length === 0) {
        throw new Error('Playlist item not found');
      }

      const playlistId = (itemResult?.rows?.item(0) as { playlist_id: string })
        ?.playlist_id;

      if (!playlistId) {
        throw new Error('Playlist item not found');
      }

      const now = this.getCurrentTimestamp();

      // Delete the item and update playlist timestamp
      // Delete the playlist item
      await powerSyncSystem.execute('DELETE FROM playlist_items WHERE id = ?', [
        playlistItemId,
      ]);

      // Update playlist timestamp
      await powerSyncSystem.execute(
        'UPDATE playlists SET updated_at = ? WHERE id = ?',
        [now, playlistId]
      );

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistService] Playlist item deleted successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistService] Failed to delete playlist item:',
        error
      );
      throw new Error('Failed to delete playlist item. Please try again.');
    }
  }
}

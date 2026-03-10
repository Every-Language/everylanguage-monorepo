export interface TagRow {
  key: string;
  value: string;
}

interface QuestTagLinkRow {
  tag: TagRow | null;
}

export function parseTagsFromQuest(quest: {
  quest_tag_link?: unknown;
}): TagRow[] {
  const links = quest.quest_tag_link as QuestTagLinkRow[] | null | undefined;
  if (!Array.isArray(links)) return [];
  return links
    .map(link => link?.tag)
    .filter((t): t is TagRow => t != null && typeof t.key === 'string')
    .map(t => ({ key: t.key, value: t.value }));
}

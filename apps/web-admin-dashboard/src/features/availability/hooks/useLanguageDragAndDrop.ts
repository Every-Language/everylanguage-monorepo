import { useState, useEffect } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { LanguageEntityWithRegions } from '@/types';

interface UseLanguageDragAndDropProps {
  languages: LanguageEntityWithRegions[];
  isReordering: boolean;
  onReorder: (ordered: LanguageEntityWithRegions[]) => void;
}

export function useLanguageDragAndDrop({
  languages,
  isReordering,
  onReorder,
}: UseLanguageDragAndDropProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [orderedLanguages, setOrderedLanguages] = useState<
    LanguageEntityWithRegions[]
  >([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    setOrderedLanguages(prev => {
      if (!isReordering) {
        return prev.length > 0 ? [] : prev;
      }
      if (languages.length === 0) {
        return prev.length > 0 ? [] : prev;
      }
      const isSameOrder =
        prev.length === languages.length &&
        prev.every((language, index) => language.id === languages[index]?.id);
      return isSameOrder ? prev : languages;
    });
  }, [isReordering, languages]);

  const handleDragStart = (event: DragStartEvent): void => {
    if (!isReordering) return;
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent): void => {
    if (!isReordering) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedLanguages(prev => {
      const oldIndex = prev.findIndex(item => item.id === active.id);
      const newIndex = prev.findIndex(item => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    if (!isReordering) return;
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const hasOrderChanged =
      orderedLanguages.length === languages.length &&
      orderedLanguages.some(
        (language, index) => language.id !== languages[index]?.id
      );
    if (!hasOrderChanged) return;
    onReorder(orderedLanguages);
  };

  return {
    activeDragId,
    orderedLanguages,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

import { useMemo, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FilesWithMetadata } from "@/lib/types/FileMetaTypes";
import { sortFilesWithNumbers } from "@/lib/sortFunction";
import { getFilesInFolder, deleteVideo, reorderVideos } from "@/server/functions/files";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";

interface UseVideoFilesOptions {
  folderPath: string | undefined;
}

interface UseVideoFilesReturn {
  files: FilesWithMetadata[];
  isLoading: boolean;
  isDeleting: boolean;
  isReordering: boolean;
  isBusy: boolean;
  deleteFile: (fileName: string) => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  invalidateFiles: () => void;
}

export function useVideoFiles({ folderPath }: UseVideoFilesOptions): UseVideoFilesReturn {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Use TanStack Query to fetch files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["files", folderPath],
    queryFn: async () => {
      if (!folderPath) return [];
      console.log("Fetching files for path:", folderPath);
      try {
        const result = await getFilesInFolder({ data: { path: folderPath } });
        console.log("Files fetched:", result.length, "files");
        return result;
      } catch (e) {
        console.error("Error getting files", e);
        return [];
      }
    },
    enabled: !!folderPath,
    staleTime: 0,
  });

  const sortedFiles = useMemo(() => {
    return [...files].sort((a: FilesWithMetadata, b: FilesWithMetadata) => sortFilesWithNumbers(a.name, b.name));
  }, [files]);

  const invalidateFiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["files", folderPath] });
  }, [queryClient, folderPath]);

  // Handle video delete
  const deleteFile = useCallback(
    async (fileName: string) => {
      if (!folderPath) return;
      if (!confirm(`Weet je zeker dat je "${fileName}" wilt verwijderen?`)) return;

      setIsDeleting(true);
      try {
        await deleteVideo({
          data: {
            folderPath: folderPath,
            fileName,
          },
        });
        // Refresh file list
        invalidateFiles();
      } catch (e) {
        console.error("Error deleting video", e);
        alert("Fout bij verwijderen van video");
      } finally {
        setIsDeleting(false);
      }
    },
    [folderPath, invalidateFiles]
  );

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !folderPath) return;

      const oldIndex = sortedFiles.findIndex((f) => f.name === active.id);
      const newIndex = sortedFiles.findIndex((f) => f.name === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically update the local order
      const newOrder = arrayMove(sortedFiles, oldIndex, newIndex);
      const orderedFileNames = newOrder.map((f) => f.name);

      setIsReordering(true);
      try {
        await reorderVideos({
          data: {
            folderPath: folderPath,
            orderedFileNames,
          },
        });
        // Refresh file list to get the new names
        invalidateFiles();
      } catch (e) {
        console.error("Error reordering videos", e);
        alert("Fout bij herordenen van video's");
      } finally {
        setIsReordering(false);
      }
    },
    [folderPath, sortedFiles, invalidateFiles]
  );

  return {
    files: sortedFiles,
    isLoading,
    isDeleting,
    isReordering,
    isBusy: isDeleting || isReordering,
    deleteFile,
    handleDragEnd,
    invalidateFiles,
  };
}

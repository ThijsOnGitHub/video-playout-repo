import { useRef } from "react";
import { Upload } from "lucide-react";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableVideoCard } from "./SortableVideoCard";
import { useVideoFiles } from "@/hooks/useVideoFiles";
import { useUploadContext } from "@/contexts/UploadContext";

export interface VideoManagerProps {
  folderPath: string | undefined;
}

export const VideoManager: React.FC<VideoManagerProps> = ({ folderPath }) => {
  // Video files management
  const { files, isLoading, isDeleting, isReordering, isBusy: isFilesBusy, deleteFile, handleDragEnd, invalidateFiles } = useVideoFiles({ folderPath });

  // Video upload via global context
  const { uploadFiles, hasActiveUploads } = useUploadContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && folderPath) {
      uploadFiles(files, folderPath, invalidateFiles);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isBusy = hasActiveUploads || isFilesBusy;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <CardTitle>Video's</CardTitle>
        {folderPath && (
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleFileInputChange} className="hidden" id="video-upload" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
              <Upload className="h-4 w-4 mr-2" />
              Video uploaden
            </Button>
          </div>
        )}
      </div>

      {isLoading && <div className="text-center text-muted-foreground py-8">Video's laden...</div>}

      {!isLoading && !folderPath && <div className="text-center text-muted-foreground py-8">Selecteer eerst een map</div>}

      {!isLoading && folderPath && files.length === 0 && <div className="text-center text-muted-foreground py-8">Geen video's gevonden in deze map: {folderPath}</div>}

      {!isLoading && folderPath && files.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">Sleep video's om de volgorde aan te passen. Bestanden worden automatisch hernummerd.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map((f) => f.name)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((file) => (
                  <SortableVideoCard key={file.name} file={file} onDelete={deleteFile} isDeleting={isDeleting} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {isReordering && <div className="text-center text-muted-foreground py-2">Volgorde opslaan...</div>}
    </div>
  );
};

import { useState, useEffect } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { browseDirectory } from "@/server/functions/files";

interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
}

export const FolderPicker: React.FC<FolderPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState(value || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // When opening, navigate to the current value's parent or root
      const initialPath = value ? value.split("/").slice(0, -1).join("/") : "";
      setCurrentPath(initialPath);
      setSelectedPath(value || "");
      loadDirectory(initialPath);
    }
  }, [open, value]);

  async function loadDirectory(path: string) {
    setLoading(true);
    try {
      const result = await browseDirectory({ data: { relativePath: path } });
      // Filter to only show directories
      const directories = result.filter((entry) => entry.isDirectory);
      setEntries(directories);
    } catch (e) {
      console.error("Error loading directory", e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  function navigateToFolder(path: string) {
    setCurrentPath(path);
    loadDirectory(path);
  }

  function goUp() {
    if (!currentPath) return;
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    navigateToFolder(parentPath);
  }

  function selectFolder(path: string) {
    setSelectedPath(path);
  }

  function confirmSelection() {
    onChange(selectedPath);
    setOpen(false);
  }

  function selectCurrentFolder() {
    setSelectedPath(currentPath);
  }

  const pathParts = currentPath ? currentPath.split("/") : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="w-full justify-start">
          <FolderOpen className="mr-2 h-4 w-4" />
          {value || "Kies een map..."}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Kies een map</DialogTitle>
          <DialogDescription>Selecteer de map met video bestanden</DialogDescription>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground border-b pb-2 flex-wrap">
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => navigateToFolder("")}>
            Root
          </Button>
          {pathParts.map((part, index) => (
            <span key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4" />
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => navigateToFolder(pathParts.slice(0, index + 1).join("/"))}>
                {part}
              </Button>
            </span>
          ))}
        </div>

        {/* Current folder selection */}
        {currentPath && (
          <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
            <FolderOpen className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm font-medium">{currentPath || "/"}</span>
            <Button variant={selectedPath === currentPath ? "default" : "outline"} size="sm" onClick={selectCurrentFolder}>
              {selectedPath === currentPath ? "Geselecteerd" : "Selecteer deze map"}
            </Button>
          </div>
        )}

        {/* Directory listing */}
        <div className="border rounded-md max-h-[300px] overflow-y-auto">
          {currentPath && (
            <button type="button" onClick={goUp} className="w-full flex items-center gap-2 p-2 hover:bg-accent text-left border-b">
              <ChevronUp className="h-4 w-4" />
              <span className="text-sm">..</span>
            </button>
          )}

          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Laden...</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Geen submappen gevonden</div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => navigateToFolder(entry.path)}
                onDoubleClick={() => {
                  setSelectedPath(entry.path);
                }}
                className={`w-full flex items-center gap-2 p-2 hover:bg-accent text-left ${selectedPath === entry.path ? "bg-accent" : ""}`}
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{entry.name}</span>
                <Button
                  variant={selectedPath === entry.path ? "default" : "ghost"}
                  size="sm"
                  className="h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectFolder(entry.path);
                  }}
                >
                  {selectedPath === entry.path ? "✓" : "Selecteer"}
                </Button>
              </button>
            ))
          )}
        </div>

        {/* Selected path display */}
        {selectedPath && (
          <div className="text-sm">
            <span className="text-muted-foreground">Geselecteerd: </span>
            <span className="font-medium">{selectedPath}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button onClick={confirmSelection} disabled={!selectedPath}>
            Bevestigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

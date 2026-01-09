import { useState, useEffect } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronUp, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { browseDirectory, createDirectory, renameDirectory, deleteDirectory } from "@/server/functions/files";

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
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createError, setCreateError] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderPath, setRenameFolderPath] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [deleteFolderPath, setDeleteFolderPath] = useState("");
  const [deleteFolderName, setDeleteFolderName] = useState("");
  const [deleteError, setDeleteError] = useState("");

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

  async function handleCreateFolder() {
    if (!newFolderName.trim()) {
      setCreateError("Mapnaam is verplicht");
      return;
    }

    try {
      setCreateError("");
      const newPath = await createDirectory({
        data: {
          relativePath: currentPath,
          folderName: newFolderName.trim(),
        },
      });

      setNewFolderName("");
      setCreateFolderOpen(false);
      loadDirectory(currentPath);
      setSelectedPath(newPath);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Er is een fout opgetreden");
    }
  }

  function openRenameDialog(folderPath: string, folderName: string) {
    setRenameFolderPath(folderPath);
    setRenameFolderName(folderName);
    setRenameError("");
    setRenameFolderOpen(true);
  }

  async function handleRenameFolder() {
    if (!renameFolderName.trim()) {
      setRenameError("Mapnaam is verplicht");
      return;
    }

    try {
      setRenameError("");
      const newPath = await renameDirectory({
        data: {
          relativePath: renameFolderPath,
          newFolderName: renameFolderName.trim(),
        },
      });

      setRenameFolderOpen(false);
      setRenameFolderPath("");
      setRenameFolderName("");
      loadDirectory(currentPath);

      // Update selected path if the renamed folder was selected
      if (selectedPath === renameFolderPath) {
        setSelectedPath(newPath);
      }
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : "Er is een fout opgetreden");
    }
  }

  function openDeleteDialog(folderPath: string, folderName: string) {
    setDeleteFolderPath(folderPath);
    setDeleteFolderName(folderName);
    setDeleteError("");
    setDeleteFolderOpen(true);
  }

  async function handleDeleteFolder() {
    try {
      setDeleteError("");
      await deleteDirectory({
        data: {
          relativePath: deleteFolderPath,
        },
      });

      setDeleteFolderOpen(false);
      setDeleteFolderPath("");
      setDeleteFolderName("");
      loadDirectory(currentPath);

      // Clear selected path if the deleted folder was selected
      if (selectedPath === deleteFolderPath) {
        setSelectedPath("");
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Er is een fout opgetreden");
    }
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
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
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
          <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Nieuwe map
          </Button>
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
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog(entry.path, entry.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(entry.path, entry.name);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
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
                </div>
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

      {/* Create folder dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nieuwe map maken</DialogTitle>
            <DialogDescription>Maak een nieuwe map in de huidige locatie</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="folder-name" className="text-sm font-medium">
                Mapnaam
              </label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  setCreateError("");
                }}
                placeholder="Mijn nieuwe map"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder();
                  }
                }}
              />
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <div className="text-sm text-muted-foreground">
              <span>Locatie: </span>
              <span className="font-medium">{currentPath || "/"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateFolderOpen(false);
                setNewFolderName("");
                setCreateError("");
              }}
            >
              Annuleren
            </Button>
            <Button onClick={handleCreateFolder}>Maken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Map hernoemen</DialogTitle>
            <DialogDescription>Geef de map een nieuwe naam</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="rename-folder-name" className="text-sm font-medium">
                Nieuwe mapnaam
              </label>
              <Input
                id="rename-folder-name"
                value={renameFolderName}
                onChange={(e) => {
                  setRenameFolderName(e.target.value);
                  setRenameError("");
                }}
                placeholder="Nieuwe naam"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameFolder();
                  }
                }}
              />
              {renameError && <p className="text-sm text-destructive">{renameError}</p>}
            </div>
            <div className="text-sm text-muted-foreground">
              <span>Map: </span>
              <span className="font-medium">{renameFolderPath}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameFolderOpen(false);
                setRenameFolderPath("");
                setRenameFolderName("");
                setRenameError("");
              }}
            >
              Annuleren
            </Button>
            <Button onClick={handleRenameFolder}>Hernoemen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation dialog */}
      <Dialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Map verwijderen</DialogTitle>
            <DialogDescription>Weet je zeker dat je deze map wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive">Waarschuwing</p>
              <p className="text-sm text-muted-foreground mt-1">Alle bestanden en submappen in deze map worden permanent verwijderd.</p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Map: </span>
              <span className="font-medium">{deleteFolderName}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Pad: </span>
              <span className="font-medium">{deleteFolderPath}</span>
            </div>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteFolderOpen(false);
                setDeleteFolderPath("");
                setDeleteFolderName("");
                setDeleteError("");
              }}
            >
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

import { useParams, useSearch } from "wouter";
import { 
  useListFiles, getListFilesQueryKey, 
  useReadFile, getReadFileQueryKey,
  useWriteFile, 
  useDeleteFile, 
  useCreateDirectory, 
  useRenameFile 
} from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Folder, File as FileIcon, FileText, Download, Trash2, Edit2, FolderPlus, FilePlus, ChevronRight, X, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServerFiles() {
  const { id } = useParams<{ id: string }>();
  const serverId = parseInt(id);
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentPath = searchParams.get("path") || "/";
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'mkdir' | 'rename'>('mkdir');
  const [dialogInput, setDialogInput] = useState("");
  const [targetItem, setTargetItem] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: listData, isLoading: listLoading } = useListFiles(serverId, { path: currentPath }, {
    query: {
      enabled: !!serverId,
      queryKey: getListFilesQueryKey(serverId, { path: currentPath })
    }
  });

  const { data: fileData, isLoading: fileLoading } = useReadFile(serverId, { path: selectedFile! }, {
    query: {
      enabled: !!serverId && !!selectedFile && !isEditing,
      queryKey: getReadFileQueryKey(serverId, { path: selectedFile! })
    }
  });

  useEffect(() => {
    if (fileData && !isEditing) {
      setFileContent(fileData.content);
    }
  }, [fileData, isEditing]);

  const writeMutation = useWriteFile({
    mutation: {
      onSuccess: () => {
        toast({ title: "File saved" });
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getReadFileQueryKey(serverId, { path: selectedFile! }) });
      },
      onError: (e) => toast({ title: "Save failed", description: e.error, variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteFile({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deleted successfully" });
        if (selectedFile) setSelectedFile(null);
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(serverId, { path: currentPath }) });
      },
      onError: (e) => toast({ title: "Delete failed", description: e.error, variant: "destructive" })
    }
  });

  const mkdirMutation = useCreateDirectory({
    mutation: {
      onSuccess: () => {
        toast({ title: "Directory created" });
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(serverId, { path: currentPath }) });
      },
      onError: (e) => toast({ title: "Create failed", description: e.error, variant: "destructive" })
    }
  });

  const renameMutation = useRenameFile({
    mutation: {
      onSuccess: () => {
        toast({ title: "Renamed successfully" });
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(serverId, { path: currentPath }) });
      },
      onError: (e) => toast({ title: "Rename failed", description: e.error, variant: "destructive" })
    }
  });

  const handleNavigate = (path: string) => {
    setSelectedFile(null);
    setIsEditing(false);
    window.history.pushState({}, '', `/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
    // Force a re-render by triggering a fake popstate
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSaveFile = () => {
    if (selectedFile) {
      writeMutation.mutate({ id: serverId, data: { path: selectedFile, content: fileContent } });
    }
  };

  const handleDelete = (path: string, type: string) => {
    if (confirm(`Delete ${type} ${path}?`)) {
      deleteMutation.mutate({ id: serverId, params: { path, recursive: type === 'directory' } });
    }
  };

  const openDialog = (type: 'mkdir' | 'rename', target = "") => {
    setDialogType(type);
    setTargetItem(target);
    setDialogInput(type === 'rename' ? target.split('/').pop() || '' : '');
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (dialogType === 'mkdir') {
      const newPath = currentPath === '/' ? `/${dialogInput}` : `${currentPath}/${dialogInput}`;
      mkdirMutation.mutate({ id: serverId, data: { path: newPath } });
    } else {
      const oldPath = targetItem;
      const parent = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = parent === '' ? `/${dialogInput}` : `${parent}/${dialogInput}`;
      renameMutation.mutate({ id: serverId, data: { oldPath, newPath } });
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 bg-background">
      <div className="h-14 border-b border-border bg-card/30 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-1 font-mono text-sm">
          <Button variant="ghost" size="sm" className="px-2" onClick={() => handleNavigate('/')} data-testid="breadcrumb-root">
            /
          </Button>
          {breadcrumbs.map((crumb, idx) => {
            const path = '/' + breadcrumbs.slice(0, idx + 1).join('/');
            return (
              <div key={path} className="flex items-center">
                <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                <Button variant="ghost" size="sm" className="px-2" onClick={() => handleNavigate(path)} data-testid={`breadcrumb-${crumb}`}>
                  {crumb}
                </Button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openDialog('mkdir')} className="font-mono text-xs" data-testid="btn-new-folder">
            <FolderPlus className="w-4 h-4 mr-2" /> New Dir
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left pane: File List */}
        <div className={`flex-1 border-r border-border overflow-hidden flex flex-col ${selectedFile ? 'hidden md:flex' : 'flex'}`}>
          <div className="bg-muted/30 border-b border-border grid grid-cols-12 gap-4 px-4 py-2 font-mono text-xs text-muted-foreground font-bold">
            <div className="col-span-6">Name</div>
            <div className="col-span-2 text-right">Size</div>
            <div className="col-span-2">Perms</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ScrollArea className="flex-1">
            {listLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="font-mono text-sm">
                {listData?.parentPath && (
                  <div 
                    className="grid grid-cols-12 gap-4 px-4 py-2 hover:bg-accent/50 cursor-pointer items-center border-b border-border/50"
                    onClick={() => handleNavigate(listData.parentPath!)}
                    data-testid="file-parent-dir"
                  >
                    <div className="col-span-6 flex items-center text-primary">
                      <Folder className="w-4 h-4 mr-3 fill-primary/20" /> ..
                    </div>
                  </div>
                )}
                {listData?.entries.map((entry) => (
                  <div 
                    key={entry.path} 
                    className={`grid grid-cols-12 gap-4 px-4 py-2 hover:bg-accent/50 cursor-pointer items-center border-b border-border/50 group ${selectedFile === entry.path ? 'bg-primary/10' : ''}`}
                    onClick={() => {
                      if (entry.type === 'directory') handleNavigate(entry.path);
                      else setSelectedFile(entry.path);
                    }}
                    data-testid={`file-entry-${entry.name}`}
                  >
                    <div className="col-span-6 flex items-center truncate">
                      {entry.type === 'directory' ? (
                        <Folder className="w-4 h-4 mr-3 text-primary fill-primary/20 flex-shrink-0" />
                      ) : (
                        <FileIcon className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate" title={entry.name}>{entry.name}</span>
                    </div>
                    <div className="col-span-2 text-right text-xs text-muted-foreground">
                      {entry.size !== null && entry.size !== undefined ? (entry.size < 1024 ? `${entry.size} B` : `${(entry.size / 1024).toFixed(1)} KB`) : '-'}
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      {entry.permissions}
                    </div>
                    <div className="col-span-2 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); openDialog('rename', entry.path); }} data-testid={`btn-rename-${entry.name}`}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(entry.path, entry.type); }} data-testid={`btn-delete-${entry.name}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right pane: Preview / Editor */}
        {selectedFile && (
          <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0C]">
            <div className="h-12 border-b border-border bg-card/80 flex items-center justify-between px-4">
              <div className="font-mono text-sm font-bold truncate text-primary mr-4 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                {selectedFile.split('/').pop()}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="h-8 font-mono text-xs">Cancel</Button>
                    <Button size="sm" onClick={handleSaveFile} disabled={writeMutation.isPending} className="h-8 font-mono text-xs">
                      <Save className="w-3 h-3 mr-2" /> Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 font-mono text-xs">
                      <Edit2 className="w-3 h-3 mr-2" /> Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSelectedFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {fileLoading && !isEditing ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading content...
                </div>
              ) : fileData?.isBinary ? (
                <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-4">
                  <Download className="w-12 h-12" />
                  <p className="font-mono">Binary file preview not supported</p>
                </div>
              ) : isEditing ? (
                <Textarea 
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="flex-1 font-mono text-sm bg-transparent border-border/50 resize-none focus-visible:ring-1 p-4"
                  data-testid="textarea-file-editor"
                />
              ) : (
                <ScrollArea className="flex-1 border border-border/50 rounded-md bg-card/10">
                  <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words text-muted-foreground">
                    {fileContent || <span className="text-muted-foreground/50 italic">Empty file</span>}
                  </pre>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">
              {dialogType === 'mkdir' ? 'Create Directory' : 'Rename Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder={dialogType === 'mkdir' ? 'Directory name' : 'New name'}
              className="font-mono"
              autoFocus
              data-testid="input-dialog-val"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-mono">Cancel</Button>
            <Button onClick={submitDialog} disabled={!dialogInput || mkdirMutation.isPending || renameMutation.isPending} className="font-mono">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

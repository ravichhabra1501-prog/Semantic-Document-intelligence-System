import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File, X, Loader2, CheckCircle2 } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const uploadDoc = useUploadDocument();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  });

  const handleUpload = async () => {
    if (!file) return;
    try {
      await uploadDoc.mutateAsync(file);
      toast({
        title: "Success",
        description: `${file.name} has been processed by AI.`,
      });
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && !uploadDoc.isPending) {
      setFile(null);
      onOpenChange(false);
      uploadDoc.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50 shadow-2xl rounded-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <UploadCloud className="w-5 h-5" />
              </div>
              Upload Document
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1">
              Supported formats: PDF, DOCX, TXT. Our AI will automatically extract entities and summarize.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {!file ? (
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-accent/50"}
              `}
            >
              <input {...getInputProps()} />
              <div className={`p-4 rounded-full ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">
                  {isDragActive ? "Drop file here" : "Drag & drop file here"}
                </p>
                <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT (Max 10MB)</p>
              </div>
            </div>
          ) : (
            <div className="bg-secondary/50 rounded-xl p-4 border border-border flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-background p-2 rounded-lg shadow-sm border border-border/50">
                    <File className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground truncate max-w-[200px]" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!uploadDoc.isPending && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {uploadDoc.isError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {uploadDoc.error.message}
                </div>
              )}
              
              {uploadDoc.isSuccess && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Upload successful!
                </div>
              )}

              <Button 
                className="w-full font-semibold" 
                size="lg"
                onClick={handleUpload}
                disabled={uploadDoc.isPending || uploadDoc.isSuccess}
              >
                {uploadDoc.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : uploadDoc.isSuccess ? (
                  "Done"
                ) : (
                  "Process Document"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

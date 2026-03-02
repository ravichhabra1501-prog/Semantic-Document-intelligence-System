import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  HardDrive, 
  Tag, 
  BrainCircuit, 
  AlertCircle,
  Trash2,
  Network
} from "lucide-react";
import { useDocument, useDeleteDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const docId = parseInt(id || "0", 10);
  
  const { data: document, isLoading, isError } = useDocument(docId);
  const deleteDoc = useDeleteDocument();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-10 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div className="min-h-screen bg-background p-10 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
        <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or has been deleted.</p>
        <Link href="/">
          <Button><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Group entities by type
  const groupedEntities = document.entities.reduce((acc, entity) => {
    if (!acc[entity.entityType]) acc[entity.entityType] = [];
    acc[entity.entityType].push(entity.value);
    return acc;
  }, {} as Record<string, string[]>);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this document permanently?")) {
      deleteDoc.mutate(document.id, {
        onSuccess: () => {
          window.location.href = "/";
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-panel border-b border-border/50 px-6 lg:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:bg-secondary">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 border-l border-border/50 pl-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-foreground line-clamp-1">{document.originalName}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="capitalize px-2 py-0.5 rounded-full bg-secondary font-medium">
                  {document.status}
                </span>
                • {format(new Date(document.createdAt || new Date()), "PPp")}
              </div>
            </div>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} className="hidden sm:flex shadow-sm">
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>
      </header>

      <main className="p-6 lg:p-10 max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-8">
          {/* AI Summary Card */}
          <Card className="border-border/50 shadow-md bg-card/50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-violet-500"></div>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {document.summary ? (
                <p className="text-foreground/90 leading-relaxed text-[15px]">
                  {document.summary}
                </p>
              ) : document.status === "processing" ? (
                <div className="flex items-center gap-3 text-muted-foreground p-4 bg-secondary/50 rounded-lg">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  AI is currently processing this document...
                </div>
              ) : (
                <p className="text-muted-foreground italic">No summary generated.</p>
              )}
            </CardContent>
          </Card>

          {/* Full Content Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Extracted Text
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto p-6 font-mono text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {document.content || (
                  <span className="text-muted-foreground italic">No text content available.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Data Area */}
        <div className="space-y-8">
          {/* Metadata */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Classification</p>
                  <Badge variant="secondary" className="mt-1 font-semibold text-primary bg-primary/10 hover:bg-primary/20">
                    {document.classification || "Unclassified"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">File Size</p>
                  <p className="text-sm text-muted-foreground">{(document.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Format</p>
                  <p className="text-sm text-muted-foreground">{document.mimeType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Uploaded On</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(document.createdAt || new Date()), "PPP")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Entities */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="w-5 h-5 text-violet-500" />
                Extracted Entities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {Object.keys(groupedEntities).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedEntities).map(([type, values]) => (
                    <div key={type} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {type}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {values.map((val, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="bg-background px-2.5 py-1 text-xs border-border/60 hover:border-primary/50 transition-colors"
                          >
                            {val}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Network className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {document.status === "processing" 
                      ? "Extracting entities..." 
                      : "No entities identified"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

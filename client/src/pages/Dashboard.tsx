import { useState } from "react";
import { Search, Plus, Filter, Sparkles } from "lucide-react";
import { useDocuments } from "@/hooks/use-documents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDialog } from "@/components/documents/UploadDialog";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Minimal debouncing for search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // In a real app, wrap this in a debounce hook. Doing it simply here.
    setTimeout(() => setDebouncedQuery(e.target.value), 300);
  };

  const { data: documents, isLoading, isError } = useDocuments(debouncedQuery);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-10 glass-panel border-b border-border/50 px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Document Intelligence
            <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-muted-foreground mt-1">Manage and semantically search your knowledge base.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-10 bg-secondary/50 border-border/50 focus-visible:ring-primary/20 h-10 w-full"
              placeholder="Semantic search documents..." 
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 hidden sm:flex border-border/50">
            <Filter className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsUploadOpen(true)} className="h-10 font-semibold shrink-0 shadow-lg shadow-primary/20 hover:shadow-primary/30">
            <Plus className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 lg:p-10 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-xl h-48 border border-border/50"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20 bg-destructive/5 rounded-2xl border border-destructive/20">
            <p className="text-destructive font-medium text-lg">Failed to load documents</p>
            <p className="text-muted-foreground mt-2">Please check your connection and try again.</p>
          </div>
        ) : documents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No documents found</h3>
            <p className="text-muted-foreground max-w-md mb-8">
              {debouncedQuery 
                ? `We couldn't find any documents matching "${debouncedQuery}". Try a different search term.` 
                : "Your workspace is empty. Upload your first document to let our AI analyze and extract insights."}
            </p>
            {!debouncedQuery && (
              <Button size="lg" onClick={() => setIsUploadOpen(true)} className="font-semibold px-8 shadow-xl shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {documents?.map(doc => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </main>

      <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}

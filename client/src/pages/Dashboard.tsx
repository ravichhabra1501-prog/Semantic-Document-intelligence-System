import { useState } from "react";
import { Search, Plus, Filter, Sparkles, FileText, AlertCircle } from "lucide-react";
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
      <header className="sticky top-0 z-10 glass-panel border-b border-border/50 px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-elevation animate-fade-in-down">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-7 h-7 text-primary animate-pulse-glow" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Document Intelligence
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Manage and semantically search your knowledge base with AI.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-10 bg-secondary/50 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/40 h-11 w-full transition-smooth placeholder:text-muted-foreground/60"
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 hidden sm:flex border-border/50 hover:bg-secondary transition-smooth">
            <Filter className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsUploadOpen(true)} className="h-11 px-5 font-semibold shrink-0 shadow-elevation hover:shadow-elevation-lg transition-smooth">
            <Plus className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 lg:p-10 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-2xl h-56 border border-border/50 animate-shimmer shadow-elevation"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-24 bg-gradient-to-br from-destructive/5 to-destructive/10 rounded-3xl border border-destructive/20 shadow-elevation animate-fade-in-up">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-semibold text-lg">Failed to load documents</p>
            <p className="text-muted-foreground mt-3 text-sm">Please check your connection and try again.</p>
          </div>
        ) : documents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center animate-fade-in-up">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-8 shadow-elevation">
              <FileText className="w-12 h-12 text-primary/70" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">No documents yet</h3>
            <p className="text-muted-foreground max-w-md mb-10 leading-relaxed">
              {debouncedQuery 
                ? `We couldn't find any documents matching "${debouncedQuery}". Try a different search term.` 
                : "Your workspace is empty. Upload your first document to let our AI analyze and extract insights."}
            </p>
            {!debouncedQuery && (
              <Button size="lg" onClick={() => setIsUploadOpen(true)} className="font-semibold px-8 shadow-elevation hover:shadow-elevation-lg transition-smooth">
                <Plus className="w-5 h-5 mr-2" />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up">
            {documents?.map((doc, idx) => (
              <div key={doc.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-fade-in-up">
                <DocumentCard document={doc} />
              </div>
            ))}
          </div>
        )}
      </main>

      <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}

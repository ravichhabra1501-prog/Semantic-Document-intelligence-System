import { Link } from "wouter";
import { format } from "date-fns";
import { 
  FileText, 
  Image as ImageIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  MoreVertical,
  Trash2,
  Cpu,
  Tag as TagIcon
} from "lucide-react";
import { type DocumentResponse } from "@shared/routes";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteDocument } from "@/hooks/use-documents";

interface DocumentCardProps {
  document: DocumentResponse & { tags?: Array<{ id: number; name: string; color: string }> };
}

export function DocumentCard({ document }: DocumentCardProps) {
  const deleteDoc = useDeleteDocument();

  const getStatusIcon = () => {
    switch (document.status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "processing": return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const isImage = document.mimeType.startsWith('image/');
  const Icon = isImage ? ImageIcon : FileText;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDoc.mutate(document.id);
    }
  };

  return (
    <Link href={`/documents/${document.id}`} className="block group">
      <Card className="h-full overflow-hidden transition-smooth shadow-elevation hover:shadow-elevation-lg hover:border-primary/30 bg-card glass-panel group-hover:-translate-y-2 group-hover:scale-[1.02]">
        <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl transition-smooth group-hover:scale-110 ${isImage ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 shadow-elevation' : 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 shadow-elevation'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="font-semibold text-foreground truncate max-w-[180px]" title={document.originalName}>
                {document.originalName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(document.size / 1024).toFixed(1)} KB • {format(new Date(document.createdAt || new Date()), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground" onClick={e => e.preventDefault()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="p-5 pt-2 flex-grow">
          {document.summary ? (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {document.summary}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/60 italic mt-2">
              <Cpu className="w-4 h-4" />
              {document.status === "processing" ? "AI is analyzing document..." : "No summary generated"}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-5 pt-0 flex flex-col gap-3 border-t border-border/40 bg-muted/10 mt-auto">
          <div className="flex items-center justify-between w-full">
            <Badge variant="outline" className="bg-background capitalize text-[10px] tracking-wide font-semibold px-2 py-0.5">
              {document.classification || "Unclassified"}
            </Badge>
            <div className="flex items-center gap-1.5" title={`Status: ${document.status}`}>
              {getStatusIcon()}
              <span className="text-xs font-medium capitalize text-muted-foreground">{document.status}</span>
            </div>
          </div>
          {document.tags && document.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {document.tags.slice(0, 3).map(tag => (
                <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                  <TagIcon className="w-2.5 h-2.5" />
                  {tag.name}
                </Badge>
              ))}
              {document.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  +{document.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

import { Link } from "wouter";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Cpu,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import { type DocumentResponse } from "@shared/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteDocument } from "@/hooks/use-documents";

interface DocumentCardProps {
  document: DocumentResponse & {
    tags?: Array<{ id: number; name: string; color: string }>;
  };
}

export function DocumentCard({ document }: DocumentCardProps) {
  const deleteDoc = useDeleteDocument();

  const getStatusIcon = () => {
    switch (document.status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "processing":
        return <Clock className="h-4 w-4 animate-pulse text-blue-400" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-400" />;
    }
  };

  const isImage = document.mimeType.startsWith("image/");
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
      <Card className="mesh-panel panel-outline relative h-full overflow-hidden rounded-[1.75rem] border-white/10 transition-smooth group-hover:-translate-y-1.5 group-hover:border-primary/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(251,191,36,0.12),transparent_22%)] opacity-80" />
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <CardHeader className="relative flex flex-row items-start justify-between space-y-0 p-5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 shadow-elevation ${
                isImage ? "bg-primary/10 text-primary" : "bg-amber-400/10 text-amber-300"
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {isImage ? "Visual document" : "Text document"}
              </p>
              <h3
                className="mt-1 max-w-[180px] truncate font-semibold text-foreground"
                title={document.originalName}
              >
                {document.originalName}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {(document.size / 1024).toFixed(1)} KB |{" "}
                {format(new Date(document.createdAt || new Date()), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="relative flex-grow p-5 pt-1">
          {document.summary ? (
            <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">
              {document.summary}
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm italic text-muted-foreground/70">
              <Cpu className="h-4 w-4" />
              {document.status === "processing"
                ? "AI is analyzing document..."
                : "No summary generated"}
            </div>
          )}
        </CardContent>

        <CardFooter className="relative mt-auto flex flex-col gap-4 border-t border-white/10 bg-black/10 p-5 pt-4 backdrop-blur-sm">
          <div className="flex w-full items-center justify-between">
            <Badge
              variant="outline"
              className="border-white/10 bg-card/60 px-2 py-1 text-[10px] font-semibold capitalize tracking-[0.18em]"
            >
              {document.classification || "Unclassified"}
            </Badge>
            <div className="flex items-center gap-1.5" title={`Status: ${document.status}`}>
              {getStatusIcon()}
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {document.status}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Open analysis</span>
            <ArrowUpRight className="h-4 w-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>

          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="flex items-center gap-0.5 border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-foreground"
                >
                  <TagIcon className="h-2.5 w-2.5" />
                  {tag.name}
                </Badge>
              ))}
              {document.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-foreground"
                >
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

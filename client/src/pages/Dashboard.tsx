import { useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  FileText,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocuments } from "@/hooks/use-documents";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setTimeout(() => setDebouncedQuery(e.target.value), 300);
  };

  const { data: documents, isLoading, isError } = useDocuments(debouncedQuery);
  const totalDocs = documents?.length ?? 0;
  const completedDocs =
    documents?.filter((doc) => doc.status === "completed").length ?? 0;
  const imageDocs =
    documents?.filter((doc) => doc.mimeType.startsWith("image/")).length ?? 0;
  const aiBriefs = documents?.filter((doc) => Boolean(doc.summary)).length ?? 0;

  return (
    <div className="min-h-screen">
      <header className="px-6 pb-6 pt-6 lg:px-10 lg:pb-8">
        <div className="mesh-panel panel-outline animate-fade-in-down relative overflow-hidden rounded-[2rem] p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.12),transparent_22%)]" />
          <div className="pointer-events-none absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-white/10 bg-white/[0.03] lg:block animate-float-slow" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Signal room
                </div>
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-foreground lg:text-6xl">
                  Read documents like a
                  <span className="bg-gradient-to-r from-primary via-cyan-300 to-amber-300 bg-clip-text text-transparent">
                    {" "}live intelligence feed
                  </span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
                  Doc Intel turns uploads into summaries, workflows, and searchable
                  signal. The interface is designed to feel like an AI briefing room,
                  not a file cabinet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[28rem]">
                {[
                  { label: "Documents", value: totalDocs },
                  { label: "Processed", value: completedDocs },
                  { label: "Image Files", value: imageDocs },
                  { label: "AI Briefs", value: aiBriefs },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex w-full items-center gap-3">
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 rounded-2xl border-white/10 bg-black/20 pl-11 placeholder:text-muted-foreground/70"
                    placeholder="Search documents, summaries, classifications, or tags..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  className="h-12 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_14px_40px_rgba(16,185,129,0.18)]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Why it feels fast
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">
                    Text, workflow, entities, and tags are surfaced in one reading loop.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Launch flow
                    </p>
                    <ArrowUpRight className="h-4 w-4 text-accent" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">
                    Drop a file, let AI analyze it, then move through summary to raw text.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 pb-10 lg:px-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-[1.75rem] border border-white/10 animate-shimmer shadow-elevation"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="mesh-panel animate-fade-in-up rounded-[2rem] border-destructive/20 py-24 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <p className="text-lg font-semibold text-destructive">
              Failed to load documents
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Please check your connection and try again.
            </p>
          </div>
        ) : documents?.length === 0 ? (
          <div className="mesh-panel animate-fade-in-up flex flex-col items-center justify-center rounded-[2rem] px-4 py-32 text-center">
            <div className="animate-float-slow mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 shadow-elevation">
              <FileText className="h-12 w-12 text-primary/70" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-foreground">
              No documents yet
            </h3>
            <p className="mb-10 max-w-md leading-relaxed text-muted-foreground">
              {debouncedQuery
                ? `We couldn't find any documents matching "${debouncedQuery}". Try a different search term.`
                : "Your workspace is empty. Upload your first document to let our AI analyze and extract insights."}
            </p>
            {!debouncedQuery && (
              <Button
                size="lg"
                onClick={() => setIsUploadOpen(true)}
                className="px-8 font-semibold shadow-elevation hover:shadow-elevation-lg transition-smooth"
              >
                <Plus className="mr-2 h-5 w-5" />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 animate-fade-in-up md:grid-cols-2 xl:grid-cols-3">
            {documents?.map((doc, idx) => (
              <div
                key={doc.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="animate-fade-in-up"
              >
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

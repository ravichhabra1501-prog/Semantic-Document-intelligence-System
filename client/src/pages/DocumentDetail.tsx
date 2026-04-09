import { TagManager } from "@/components/documents/TagManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteDocument, useDocument } from "@/hooks/use-documents";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  FileText,
  GitBranch,
  HardDrive,
  Network,
  Tag,
  Trash2,
} from "lucide-react";
import { Link, useParams } from "wouter";

function parseWorkflow(
  workflow: string | null | undefined,
): { title: string; steps: string[] } | null {
  if (!workflow) return null;

  try {
    const parsed = JSON.parse(workflow);
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;

    return {
      title:
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : "Document workflow",
      steps: parsed.steps
        .map((step: unknown) => String(step).trim())
        .filter(Boolean),
    };
  } catch {
    return null;
  }
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const docId = parseInt(id || "0", 10);
  const { data: document, isLoading, isError } = useDocument(docId);
  const deleteDoc = useDeleteDocument();
  const workflow = parseWorkflow(document?.workflow);

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-6 p-6 lg:p-10">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-[220px] w-full" />
            <Skeleton className="h-[420px] w-full" />
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
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-2xl font-bold">Document Not Found</h2>
        <p className="mb-6 text-muted-foreground">
          The document you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const groupedEntities = document.entities.reduce(
    (acc, entity) => {
      if (!acc[entity.entityType]) acc[entity.entityType] = [];
      acc[entity.entityType].push(entity.value);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this document permanently?")) {
      deleteDoc.mutate(document.id, {
        onSuccess: () => {
          window.location.href = "/";
        },
      });
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-background/70 px-6 py-4 backdrop-blur-xl lg:px-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:bg-secondary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="line-clamp-1 font-display text-lg font-bold leading-tight text-foreground">
                {document.originalName}
              </h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium capitalize">
                  {document.status}
                </span>
                <span>&bull;</span>
                <span>{format(new Date(document.createdAt || new Date()), "PPp")}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="hidden shadow-sm sm:flex"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </header>

      <main className="grid max-w-7xl grid-cols-1 gap-8 p-6 lg:p-10 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <Card className="mesh-panel panel-outline overflow-hidden rounded-[2rem] border-white/10">
            <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
                  Analysis deck
                </p>
                <h2 className="text-3xl font-semibold leading-tight text-foreground">
                  One screen for summary, sequence, and raw evidence.
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  This view is tuned for reading forward: brief first, workflow second,
                  source text third. It keeps the AI explanation close to the original material.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Type
                  </p>
                  <p className="mt-2 text-sm text-foreground">{document.mimeType}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Classification
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {document.classification || "Unclassified"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mesh-panel panel-outline relative overflow-hidden rounded-[2rem] border-white/10">
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-amber-300" />
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {document.error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="font-semibold">Processing error</p>
                  <p>{document.error}</p>
                </div>
              ) : document.summary ? (
                <p className="text-[15px] leading-relaxed text-foreground/90">
                  {document.summary}
                </p>
              ) : document.status === "processing" ? (
                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-4 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  AI is currently processing this document...
                </div>
              ) : (
                <p className="italic text-muted-foreground">No summary generated.</p>
              )}
            </CardContent>
          </Card>

          <Card className="mesh-panel panel-outline overflow-hidden rounded-[2rem] border-white/10">
            <CardHeader className="border-b border-white/10 bg-white/[0.03] pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="h-5 w-5 text-primary" />
                Workflow View
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {workflow ? (
                <>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{workflow.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generated from the extracted document text.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {workflow.steps.map((step, index) => (
                      <div
                        key={`${step}-${index}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Step {index + 1}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-foreground/90">
                              {step}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        Process Summary
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground/80">
                      {workflow.steps.length > 1
                        ? `This document follows a ${workflow.steps.length}-stage flow, starting with "${workflow.steps[0]}" and ending with "${workflow.steps[workflow.steps.length - 1]}".`
                        : workflow.steps[0]}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {workflow.steps.map((step, index) => (
                        <Badge
                          key={`chip-${index}`}
                          variant="outline"
                          className="border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/80"
                        >
                          {index + 1}. {step}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="italic text-muted-foreground">
                  No workflow generated for this document yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mesh-panel panel-outline rounded-[2rem] border-white/10">
            <CardHeader className="border-b border-white/10 bg-white/[0.03] pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Extracted Text
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto p-6 font-mono text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {document.content || (
                  <span className="italic text-muted-foreground">
                    No text content available.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="mesh-panel panel-outline rounded-[2rem] border-white/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Classification</p>
                  <Badge
                    variant="secondary"
                    className="mt-1 bg-primary/10 font-semibold text-primary hover:bg-primary/20"
                  >
                    {document.classification || "Unclassified"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">File Size</p>
                  <p className="text-sm text-muted-foreground">
                    {(document.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Format</p>
                  <p className="max-w-full break-words [overflow-wrap:anywhere] text-sm leading-6 text-muted-foreground">
                    {document.mimeType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Uploaded On</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(document.createdAt || new Date()), "PPP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mesh-panel panel-outline rounded-[2rem] border-white/10">
            <CardHeader className="border-b border-white/10 bg-white/[0.03] pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="h-5 w-5 text-violet-500" />
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
                            className="border-white/10 bg-background px-2.5 py-1 text-xs transition-colors hover:border-primary/50"
                          >
                            {val}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Network className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {document.status === "processing"
                      ? "Extracting entities..."
                      : "No entities identified"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mesh-panel panel-outline rounded-[2rem] border-white/10">
            <CardHeader className="border-b border-white/10 bg-white/[0.03] pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-blue-500" />
                Organization Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <TagManager
                documentId={document.id}
                tags={(document.tags || []).map((tag) => ({
                  id: tag.id,
                  name: tag.name,
                  color: tag.color || "gray",
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

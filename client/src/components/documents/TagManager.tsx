import { useState } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const TAG_COLORS = [
  { name: "red", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
  { name: "blue", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  { name: "green", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  { name: "purple", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  { name: "yellow", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" },
  { name: "gray", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
];

interface TagManagerProps {
  documentId: number;
  tags: Array<{ id: number; name: string; color: string }>;
  onTagAdded?: () => void;
}

export function TagManager({ documentId, tags, onTagAdded }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const getColorStyle = (color: string) => {
    return TAG_COLORS.find(c => c.name === color) || TAG_COLORS[TAG_COLORS.length - 1];
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tag name cannot be empty",
      });
      return;
    }

    setIsAdding(true);
    try {
      await apiRequest("POST", `/api/documents/${documentId}/tags`, {
        name: newTagName.trim(),
        color: selectedColor,
      });

      setNewTagName("");
      setSelectedColor("blue");
      
      await queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "Success",
        description: "Tag added successfully",
      });

      onTagAdded?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add tag",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await apiRequest("DELETE", `/api/tags/${tagId}`, undefined);
      
      await queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "Success",
        description: "Tag removed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete tag",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Add Tags</label>
        <div className="flex gap-2 flex-wrap">
          {TAG_COLORS.map(color => (
            <button
              key={color.name}
              onClick={() => setSelectedColor(color.name)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : ''
              } ${color.bg} ${color.border}`}
              data-testid={`color-option-${color.name}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Enter tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
            disabled={isAdding}
            data-testid="input-tag-name"
          />
          <Button
            onClick={handleAddTag}
            disabled={isAdding || !newTagName.trim()}
            size="sm"
            data-testid="button-add-tag"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tags ({tags.length})</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const colorStyle = getColorStyle(tag.color);
              return (
                <div
                  key={tag.id}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                  data-testid={`tag-${tag.id}`}
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="ml-1 hover:opacity-75 transition-opacity"
                    aria-label={`Delete tag ${tag.name}`}
                    data-testid={`button-delete-tag-${tag.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

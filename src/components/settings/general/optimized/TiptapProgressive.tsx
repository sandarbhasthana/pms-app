"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Control, Controller, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect, lazy } from "react";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load advanced extensions
const loadAdvancedExtensions = {
  underline: () => import("@tiptap/extension-underline"),
  image: () => import("@tiptap/extension-image"),
  table: () => import("@tiptap/extension-table"),
  tableRow: () => import("@tiptap/extension-table-row"),
  tableCell: () => import("@tiptap/extension-table-cell"),
  tableHeader: () => import("@tiptap/extension-table-header"),
  textAlign: () => import("@tiptap/extension-text-align"),
  link: () => import("@tiptap/extension-link"),
  textStyle: () => import("@tiptap/extension-text-style"),
  color: () => import("@tiptap/extension-color"),
  bulletList: () => import("@tiptap/extension-bullet-list"),
  orderedList: () => import("@tiptap/extension-ordered-list"),
  listItem: () => import("@tiptap/extension-list-item")
};

interface FormValues {
  description: string;
}

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

export default function TiptapProgressive({ control, errors }: Props) {
  const [loadedExtensions, setLoadedExtensions] = useState<string[]>([]);
  const [loadingExtensions, setLoadingExtensions] = useState<string[]>([]);
  const onUpdateRef = useRef<((html: string) => void) | null>(null);

  // Basic editor with minimal extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false
      }),
      Placeholder.configure({ placeholder: "Describe your property..." })
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      if (onUpdateRef.current) {
        onUpdateRef.current(JSON.stringify(json));
      }
    }
  });

  // Load extension dynamically
  const loadExtension = async (extensionName: keyof typeof loadAdvancedExtensions) => {
    if (loadedExtensions.includes(extensionName) || loadingExtensions.includes(extensionName)) {
      return;
    }

    setLoadingExtensions(prev => [...prev, extensionName]);

    try {
      const extensionModule = await loadAdvancedExtensions[extensionName]();
      const Extension = extensionModule.default;
      
      // Add extension to editor
      if (editor) {
        editor.extensionManager.addExtension(Extension);
        setLoadedExtensions(prev => [...prev, extensionName]);
      }
    } catch (error) {
      console.error(`Failed to load extension ${extensionName}:`, error);
    } finally {
      setLoadingExtensions(prev => prev.filter(ext => ext !== extensionName));
    }
  };

  // Basic toolbar actions
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();

  // Advanced actions that load extensions
  const toggleBulletList = async () => {
    await loadExtension('bulletList');
    await loadExtension('listItem');
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = async () => {
    await loadExtension('orderedList');
    await loadExtension('listItem');
    editor?.chain().focus().toggleOrderedList().run();
  };

  const isLoading = (extensionName: string) => loadingExtensions.includes(extensionName);
  const isLoaded = (extensionName: string) => loadedExtensions.includes(extensionName);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <Label>Describe Your Property</Label>
      
      {/* Toolbar */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-t-md p-2 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-wrap gap-1">
          {/* Basic formatting - always available */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleBold}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bold") && "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleItalic}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("italic") && "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Advanced formatting - loads on demand */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleBulletList}
            disabled={isLoading('bulletList')}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bulletList") && "bg-gray-200 dark:bg-gray-700"
            )}
          >
            {isLoading('bulletList') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleOrderedList}
            disabled={isLoading('orderedList')}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("orderedList") && "bg-gray-200 dark:bg-gray-700"
            )}
          >
            {isLoading('orderedList') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListOrdered className="h-4 w-4" />
            )}
          </Button>

          {/* Extension loading indicator */}
          {loadingExtensions.length > 0 && (
            <div className="flex items-center gap-1 ml-2 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading features...
            </div>
          )}
        </div>

        {/* Performance info */}
        <div className="mt-2 text-xs text-gray-500">
          Core editor loaded (~200KB) • 
          {loadedExtensions.length > 0 && ` ${loadedExtensions.length} advanced features loaded`}
          {loadedExtensions.length === 0 && " Advanced features load on-demand"}
        </div>
      </div>

      {/* Editor */}
      <Controller
        name="description"
        control={control}
        rules={{ required: "Description is required" }}
        render={({ field }) => {
          onUpdateRef.current = field.onChange;
          return (
            <div className="border border-gray-500 dark:border-gray-400 border-t-0 rounded-b-md min-h-[200px] bg-transparent text-foreground px-4 py-2 shadow-xs transition-colors focus-within:ring-3 focus-within:ring-purple-400/20 focus-within:border-purple-400">
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:my-1 [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer hover:[&_a]:text-blue-800 dark:[&_a]:text-blue-400 dark:hover:[&_a]:text-blue-300"
              />
            </div>
          );
        }}
      />

      {errors.description && (
        <p className="text-red-500 text-sm">{errors.description.message}</p>
      )}
    </div>
  );
}

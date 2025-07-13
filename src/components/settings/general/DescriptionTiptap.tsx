"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";

import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Control, Controller, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  ImageIcon,
  TableIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";
import { Palette } from "lucide-react";

interface FormValues {
  propertyType: string;
  propertyName: string;
  phoneCode: string;
  propertyPhone: string;
  propertyEmail: string;
  propertyWebsite: string;
  firstName: string;
  lastName: string;
  country: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  description: string;
  photos: FileList | null;
  printHeaderImage: File | null;
}

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
}

const DescriptionTiptap = ({ control, errors }: Props) => {
  const onUpdateRef = useRef<((html: string) => void) | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false
      }),
      ListItem,
      BulletList,
      OrderedList,
      Underline,
      Placeholder.configure({ placeholder: "Describe your property..." }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color.configure({ types: ["textStyle"] })
    ],
    content: "",
    immediatelyRender: false, // Prevent SSR hydration mismatches
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      if (onUpdateRef.current) {
        onUpdateRef.current(JSON.stringify(json));
      }
    }
  });

  const [showColorPalette, setShowColorPalette] = useState(false);
  const predefinedColors = [
    "#ffffff",
    "#000000",
    "#ff0000",
    "#007bff",
    "#28a745",
    "#ffc107",
    "#6c757d",
    "#9810fa"
  ];
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPosition, setLinkPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const linkInputRef = useRef<HTMLDivElement>(null);

  // Link preview state
  const [showLinkPreview, setShowLinkPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewPosition, setPreviewPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const linkPreviewRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowColorPalette(false);
      }

      if (
        linkInputRef.current &&
        !linkInputRef.current.contains(event.target as Node)
      ) {
        setShowLinkInput(false);
        setLinkUrl("");
      }

      if (
        linkPreviewRef.current &&
        !linkPreviewRef.current.contains(event.target as Node)
      ) {
        setShowLinkPreview(false);
      }
    };

    if (showColorPalette || showLinkInput || showLinkPreview) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPalette, showLinkInput, showLinkPreview]);

  // Handle link hover events
  useEffect(() => {
    if (!editor) return;

    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "A" && target.getAttribute("href")) {
        const rect = target.getBoundingClientRect();
        const url = target.getAttribute("href") || "";

        setPreviewUrl(url);
        setPreviewPosition({
          top: rect.top + window.scrollY - 40, // Position above the link
          left: rect.left + window.scrollX
        });
        setShowLinkPreview(true);
      }
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "A") {
        // Add a small delay to allow moving to the preview
        setTimeout(() => {
          if (!linkPreviewRef.current?.matches(":hover")) {
            setShowLinkPreview(false);
          }
        }, 100);
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("mouseenter", handleMouseEnter, true);
    editorElement.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      editorElement.removeEventListener("mouseenter", handleMouseEnter, true);
      editorElement.removeEventListener("mouseleave", handleMouseLeave, true);
    };
  }, [editor]);

  const openLinkInput = () => {
    if (!editor) return;

    // Get the current selection
    const { from, to } = editor.state.selection;

    // If no text is selected, we'll position relative to the editor
    if (from === to) {
      // Position relative to the editor container
      const editorElement = editor.view.dom;
      const rect = editorElement.getBoundingClientRect();
      setLinkPosition({
        top: rect.top + window.scrollY - 60, // Position above the editor
        left: rect.left + window.scrollX + 20
      });
    } else {
      // Position relative to the selected text
      const coords = editor.view.coordsAtPos(from);
      setLinkPosition({
        top: coords.top + window.scrollY - 60, // Position above the selection
        left: coords.left + window.scrollX
      });
    }

    const prevUrl = editor.getAttributes("link").href || "";
    setLinkUrl(prevUrl);
    setShowLinkInput(true);
  };

  const applyLink = () => {
    if (!linkUrl || !editor) return;

    const { from, to } = editor.state.selection;

    if (from === to) {
      // No text selected, insert the URL as both text and link
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${linkUrl}">${linkUrl}</a>`)
        .run();
    } else {
      // Text is selected, apply link to selection
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }

    setShowLinkInput(false);
    setLinkUrl("");
  };

  const removeLink = () => {
    editor?.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const applyFgColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
    setShowColorPalette(false);
  };

  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        editor
          ?.chain()
          .focus()
          .setImage({ src: base64 as string })
          .run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const insertTable = () => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <Label>Describe Your Property</Label>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap border rounded-md px-2 py-1 bg-muted">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn({
            "bg-accent": editor.isActive("bold"),
            "button-tiptap": true
          })}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn({
            "bg-accent": editor.isActive("italic"),
            "button-tiptap": true
          })}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn({
            "bg-accent": editor.isActive("underline"),
            "button-tiptap": true
          })}
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertImage}
          className="button-tiptap"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertTable}
          className="button-tiptap"
        >
          <TableIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openLinkInput}
          className="button-tiptap"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        {showLinkInput && (
          <div
            ref={linkInputRef}
            className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 rounded shadow-md flex items-center gap-2"
            style={{ top: linkPosition.top, left: linkPosition.left }}
          >
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setShowLinkInput(false);
                  setLinkUrl("");
                }
              }}
              placeholder="Paste or type a link"
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-background text-foreground"
              autoFocus
            />
            <Button size="sm" variant="secondary" onClick={applyLink}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={removeLink}>
              ✕
            </Button>
          </div>
        )}

        {/* Link Preview */}
        {showLinkPreview && (
          <div
            ref={linkPreviewRef}
            className="absolute z-50 bg-amber-200 text-gray-900 dark:bg-gray-700 dark:text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs break-all"
            style={{ top: previewPosition.top, left: previewPosition.left }}
            onMouseEnter={() => setShowLinkPreview(true)}
            onMouseLeave={() => setShowLinkPreview(false)}
          >
            {previewUrl}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className="button-tiptap"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className="button-tiptap"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          className="button-tiptap"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          className="button-tiptap"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          className="button-tiptap"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          className="button-tiptap"
        >
          <AlignJustify className="w-4 h-4" />
        </Button>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowColorPalette((v) => !v)}
            className="button-tiptap"
            title="Text Color"
          >
            <Palette className="w-6 h-6" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().unsetColor().run()}
            className="button-tiptap"
            title="Clear Text Color"
          >
            <span className="text-xl font-bold">✕</span>
          </Button>
          {showColorPalette && (
            <div
              ref={colorDropdownRef}
              className="absolute z-50 mt-2 p-4 grid grid-cols-3 grid-rows-2 gap-3 rounded-md shadow-lg border border-muted bg-background dark:bg-muted/90 w-fit min-w-[9rem]"
            >
              {predefinedColors.map((col) => (
                <button
                  type="button"
                  key={col}
                  onClick={() => applyFgColor(col)}
                  className={cn(
                    "relative w-6 h-6 rounded-sm border border-gray-300 dark:border-gray-600 hover:ring-2 hover:ring-ring",
                    editor?.isActive("textStyle", { color: col })
                      ? "ring-2 ring-foreground"
                      : ""
                  )}
                  style={{ backgroundColor: col }}
                  aria-label={`Color ${col}`}
                >
                  {editor?.isActive("textStyle", { color: col }) && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
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
            <div className="border rounded-md min-h-[200px] bg-background text-foreground px-4 py-2">
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:my-1 [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer hover:[&_a]:text-blue-800 dark:[&_a]:text-blue-400 dark:hover:[&_a]:text-blue-300"
              />
            </div>
          );
        }}
      />
      {errors.description && (
        <p className="text-sm text-red-500">{errors.description.message}</p>
      )}
    </div>
  );
};

export default DescriptionTiptap;

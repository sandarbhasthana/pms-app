"use client";

import { FC, useEffect, useState, KeyboardEvent } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { RoomGroup, RoomType } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getCookie } from "cookies-next";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import NextImage from "next/image";
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
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

// Form Values
export type FormValues = {
  title: string;
  abbreviation: string;
  privateOrDorm: "private" | "shared";
  physicalOrVirtual: "physical" | "virtual";
  units: number;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  adultsIncluded: number;
  childrenIncluded: number;
  description: string;
  amenities: string[];
  customAmenities: string[];
  featuredImage: File | null;
  additionalImages: File[];
  // Pricing fields
  basePrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  currency: string;
  availability?: number;
  minLOS?: number;
  maxLOS?: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  rooms: {
    id: string;
    name: string;
    description: string;
    doorlockId: string;
    images: File[];
  }[];
};

// Predefined Amenities
const PREDEFINED_AMENITIES = [
  "Bathrobes",
  "220–240 volt circuits",
  "Ceiling fan",
  "LAN internet (wired)",
  "AM / FM radio",
  "Cribs upon request",
  "Air-conditioning",
  "Wireless internet (WiFi)",
  "Slippers",
  "Cable television",
  "Microwave",
  "Hairdryer",
  "110–120 volt circuits",
  "Cable television – fee",
  "iPod music dock",
  "Minibar"
];

// Tiptap Editor Component
interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const TiptapEditor: FC<TiptapEditorProps> = ({ content, onChange }) => {
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
      Placeholder.configure({
        placeholder: "Describe this accommodation type..."
      }),
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
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    }
  });

  if (!editor) return null;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-3 border-b-2 border-purple-100 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 rounded-t-lg">
        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-muted" : ""}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        {/* Text Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "bg-muted" : ""}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "bg-muted" : ""}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "bg-muted" : ""}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={
            editor.isActive({ textAlign: "justify" }) ? "bg-muted" : ""
          }
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        {/* Insert Elements */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
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
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="border border-gray-500 dark:border-gray-400 rounded-lg min-h-[180px] bg-white dark:bg-gray-900 text-foreground px-6 py-4 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors focus-within:border-purple-400 focus-within:ring-3 focus-within:ring-purple-400/20">
        <EditorContent
          editor={editor}
          className="prose prose-base max-w-none
            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-1
            [&_li]:my-1 [&_li]:text-gray-700 dark:[&_li]:text-gray-300
            [&_a]:text-purple-600 [&_a]:underline [&_a]:cursor-pointer [&_a]:font-medium hover:[&_a]:text-purple-800 dark:[&_a]:text-purple-400 dark:hover:[&_a]:text-purple-300
            [&_p]:my-3 [&_p]:text-gray-800 dark:[&_p]:text-gray-200 [&_p]:leading-relaxed
            [&_strong]:font-bold [&_strong]:text-gray-900 dark:[&_strong]:text-white
            [&_em]:italic [&_em]:text-gray-700 dark:[&_em]:text-gray-300
            [&_u]:underline [&_u]:decoration-purple-400
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-800 dark:[&_h2]:text-gray-100 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-gray-800 dark:[&_h3]:text-gray-100 [&_h3]:mb-2
            [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_table]:shadow-sm
            [&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600 [&_td]:p-3 [&_td]:text-gray-700 dark:[&_td]:text-gray-300
            [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_th]:p-3 [&_th]:bg-purple-50 dark:[&_th]:bg-purple-900/20 [&_th]:font-semibold [&_th]:text-gray-900 dark:[&_th]:text-white
            [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:shadow-sm [&_img]:my-4
            [&_blockquote]:border-l-4 [&_blockquote]:border-purple-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 dark:[&_blockquote]:text-gray-400 [&_blockquote]:my-4
            focus:outline-none"
        />
      </div>
    </div>
  );
};

interface Props {
  group: RoomGroup;
  onCancel: () => void;
  onSave: (data: FormValues) => void;
}

export const AccommodationDetailsForm: FC<Props> = ({
  group,
  onCancel,
  onSave
}) => {
  const [roomTypeData, setRoomTypeData] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<FormValues>({
    defaultValues: {
      title: group.type,
      abbreviation: group.type
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3),
      privateOrDorm: "private",
      physicalOrVirtual: "physical",
      units: group.rooms.length,
      maxOccupancy: 1,
      maxAdults: 1,
      maxChildren: 0,
      adultsIncluded: 1,
      childrenIncluded: 0,
      description: "",
      amenities: [],
      customAmenities: [],
      featuredImage: null,
      additionalImages: [],
      // Pricing defaults
      basePrice: 0,
      weekdayPrice: undefined,
      weekendPrice: undefined,
      currency: "INR",
      availability: 1,
      minLOS: undefined,
      maxLOS: undefined,
      closedToArrival: false,
      closedToDeparture: false,
      rooms: group.rooms.map((r) => ({
        id: r.id,
        name: r.name || "",
        description: r.description || "",
        doorlockId: r.doorlockId || "",
        images: []
      }))
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control, // gets from the form instance
    name: "rooms"
  });

  // local temp for custom-amenities input
  const [tagInput, setTagInput] = useState("");

  // State for image previews
  const [featuredImagePreview, setFeaturedImagePreview] = useState<
    string | null
  >(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<
    string[]
  >([]);

  // State for upload progress
  const [isUploading, setIsUploading] = useState(false);

  // Load existing room type data
  useEffect(() => {
    const loadRoomTypeData = async () => {
      try {
        const orgId = getCookie("orgId");
        if (!orgId) {
          setLoading(false);
          return;
        }

        console.log(`🔍 Loading room type data for: "${group.type}"`);
        const response = await fetch(
          `/api/room-types/by-name?name=${encodeURIComponent(group.type)}`,
          {
            headers: {
              "x-organization-id": orgId as string
            }
          }
        );

        console.log(`📡 API Response status: ${response.status}`);

        if (response.ok) {
          const roomType: RoomType = await response.json();
          console.log("✅ Room type data loaded:", roomType);
          setRoomTypeData(roomType);

          // Set image previews from existing URLs
          if (roomType.featuredImageUrl) {
            setFeaturedImagePreview(roomType.featuredImageUrl);
          }
          if (
            roomType.additionalImageUrls &&
            roomType.additionalImageUrls.length > 0
          ) {
            setAdditionalImagePreviews(roomType.additionalImageUrls);
          }

          // Update form with existing data
          form.reset({
            title: roomType.name,
            abbreviation:
              roomType.abbreviation ||
              group.type
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 3),
            privateOrDorm: roomType.privateOrDorm as "private" | "shared",
            physicalOrVirtual: roomType.physicalOrVirtual as
              | "physical"
              | "virtual",
            units: group.rooms.length,
            maxOccupancy: roomType.maxOccupancy,
            maxAdults: roomType.maxAdults,
            maxChildren: roomType.maxChildren,
            adultsIncluded: roomType.adultsIncluded,
            childrenIncluded: roomType.childrenIncluded,
            description: roomType.description || "",
            amenities: roomType.amenities || [],
            customAmenities: roomType.customAmenities || [],
            featuredImage: null,
            additionalImages: [],
            rooms: group.rooms.map((r) => ({
              id: r.id,
              name: r.name || "",
              description: r.description || "",
              doorlockId: r.doorlockId || "",
              images: []
            }))
          });
        } else {
          console.log(
            `❌ Room type not found (${response.status}), using defaults`
          );
          setRoomTypeData(null);
        }
      } catch (error) {
        console.error("Failed to load room type data:", error);
        setRoomTypeData(null);
      } finally {
        setLoading(false);
      }
    };

    loadRoomTypeData();
  }, [group, form]);

  // If you want to reset when group changes:
  useEffect(() => {
    if (!loading && !roomTypeData) {
      form.reset({
        ...form.getValues(),
        title: group.type,
        units: group.rooms.length
      });
    }
  }, [group, form, loading, roomTypeData]);

  // Helper function to upload file to S3
  const uploadToS3 = async (file: File): Promise<string> => {
    try {
      // 1. Get presigned URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type })
      });

      if (!presignRes.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const { presignedUrl, publicUrl } = await presignRes.json();

      // 2. Upload file to S3
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload to S3");
      }

      return publicUrl;
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      console.log("💾 Saving room type data:", values);
      setIsUploading(true);

      // First save the room type data
      const orgId = getCookie("orgId");
      if (orgId) {
        // Upload featured image if present
        let featuredImageUrl: string | null = null;
        if (values.featuredImage) {
          toast.info("Uploading featured image...");
          featuredImageUrl = await uploadToS3(values.featuredImage);
        }

        // Upload additional images if present
        let additionalImageUrls: string[] = [];
        if (values.additionalImages && values.additionalImages.length > 0) {
          toast.info("Uploading additional images...");
          additionalImageUrls = await Promise.all(
            Array.from(values.additionalImages).map(uploadToS3)
          );
        }

        // Upload individual room images
        const roomsWithImageUrls = await Promise.all(
          values.rooms.map(async (room) => {
            let imageUrls: string[] = [];
            if (room.images && room.images.length > 0) {
              imageUrls = await Promise.all(
                Array.from(room.images).map(uploadToS3)
              );
            }
            return {
              name: room.name,
              description: room.description,
              doorlockId: room.doorlockId,
              imageUrls // Store the uploaded URLs
            };
          })
        );

        const roomTypePayload = {
          name: values.title,
          abbreviation: values.abbreviation,
          privateOrDorm: values.privateOrDorm,
          physicalOrVirtual: values.physicalOrVirtual,
          maxOccupancy: parseInt(values.maxOccupancy.toString()) || 1,
          maxAdults: parseInt(values.maxAdults.toString()) || 1,
          maxChildren: parseInt(values.maxChildren.toString()) || 0,
          adultsIncluded: parseInt(values.adultsIncluded.toString()) || 1,
          childrenIncluded: parseInt(values.childrenIncluded.toString()) || 0,
          description: values.description,
          amenities: values.amenities || [],
          customAmenities: values.customAmenities || [],
          featuredImageUrl,
          additionalImageUrls,
          rooms: roomsWithImageUrls, // Include rooms with image URLs
          // Pricing fields
          basePrice: values.basePrice,
          weekdayPrice: values.weekdayPrice || null,
          weekendPrice: values.weekendPrice || null,
          currency: values.currency,
          availability: values.availability || null,
          minLOS: values.minLOS || null,
          maxLOS: values.maxLOS || null,
          closedToArrival: values.closedToArrival,
          closedToDeparture: values.closedToDeparture
        };

        console.log("📤 Sending room type payload:", roomTypePayload);

        const response = await fetch("/api/room-types/by-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": orgId as string
          },
          body: JSON.stringify(roomTypePayload)
        });

        if (response.ok) {
          const savedRoomType = await response.json();
          console.log("✅ Room type saved successfully:", savedRoomType);

          // Update individual rooms with their image URLs
          if (roomsWithImageUrls.length > 0) {
            const roomUpdates = roomsWithImageUrls
              .map((room, idx) => {
                const existingRoom = group.rooms[idx];
                if (!existingRoom) return null;

                return {
                  id: existingRoom.id,
                  name: room.name,
                  description: room.description || "",
                  doorlockId: room.doorlockId || "",
                  imageUrl: room.imageUrls[0] || null // Use first image as main image
                };
              })
              .filter(Boolean);

            if (roomUpdates.length > 0) {
              const roomsResponse = await fetch("/api/rooms/bulk-update", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "x-organization-id": orgId as string
                },
                body: JSON.stringify(roomUpdates)
              });

              if (roomsResponse.ok) {
                console.log("✅ Rooms updated successfully");
              } else {
                console.error("❌ Failed to update rooms");
              }
            }
          }

          // Don't show toast here - let AccommodationsTable handle the final success message
        } else {
          const errorText = await response.text();
          console.error(
            "❌ Failed to save room type:",
            response.status,
            errorText
          );
          toast.error(
            `Failed to save room type "${values.title}": ${
              errorText || "Unknown error"
            }`
          );
        }
      }

      // Then call the original onSave for room management
      onSave(values);
    } catch (error) {
      console.error("Failed to save room type data:", error);
      toast.error(
        `Error saving room type "${values.title}": ${
          error instanceof Error ? error.message : "Network or server error"
        }`
      );
      // Still call onSave to handle room updates even if room type save fails
      onSave(values);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTagKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    onChange: (v: string[]) => void,
    current: string[]
  ) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      onChange([...current, tagInput.trim()]);
      setTagInput("");
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading accommodation settings...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 p-4 pb-8"
      >
        {/* Title + Abbreviation */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accommodation Title *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accommodation Abbreviation *</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Private vs Shared Dorm */}
        <FormField
          control={form.control}
          name="privateOrDorm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Is this accommodation private or a shared dorm room (with beds)?
                *
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <FormLabel htmlFor="private">
                      Private accommodation
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <RadioGroupItem value="shared" id="shared" />
                    <FormLabel htmlFor="shared">Shared dorm room</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Physical vs Virtual */}
        <FormField
          control={form.control}
          name="physicalOrVirtual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Is this accommodation physical or a virtually combined
                accommodation? *
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2">
                    <RadioGroupItem value="physical" id="physical" />
                    <FormLabel htmlFor="physical">Physical</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <RadioGroupItem value="virtual" id="virtual" />
                    <FormLabel htmlFor="virtual">Virtual (combined)</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Number fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of units</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxOccupancy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum occupancy *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={String(field.value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(10)].map((_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Adults / Children */}
        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="maxAdults"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Adults *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={String(field.value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxChildren"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Children *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={String(field.value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="adultsIncluded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adults included in rate *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={String(field.value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="childrenIncluded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Children included in rate *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={String(field.value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Base Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="weekdayPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekday Price (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Leave empty to use base price"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weekendPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekend Price (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Leave empty to use base price"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Availability per Room</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minLOS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Length of Stay</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="No minimum"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxLOS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Length of Stay</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="No maximum"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="closedToArrival"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium leading-4">
                    Closed to Arrival
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="closedToDeparture"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium leading-4">
                    Closed to Departure
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Accommodation description *</FormLabel>
              <FormControl>
                <TiptapEditor content={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amenities checklist */}
        <FormField
          control={form.control}
          name="amenities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Accommodation Amenities (for Booking Engine)
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {PREDEFINED_AMENITIES.map((amenity) => (
                    <label
                      key={amenity}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={field.value.includes(amenity)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...field.value, amenity]
                            : field.value.filter((a) => a !== amenity);
                          field.onChange(next);
                        }}
                        className="!h-3 !w-3 !min-h-3 !min-w-3 mr-2 mt-2"
                      />
                      <span className="text-md font-medium leading-none">
                        {amenity}
                      </span>
                    </label>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom amenities tags */}
        <FormField
          control={form.control}
          name="customAmenities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add additional custom amenities</FormLabel>
              <FormControl>
                <div>
                  <input
                    type="text"
                    placeholder="Type and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) =>
                      handleTagKeyDown(e, field.onChange, field.value)
                    }
                    className="border border-gray-500 dark:border-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-3 focus:ring-purple-400/20 focus:border-purple-400"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {field.value.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center space-x-1 bg-gray-200 px-2 py-1 rounded"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() =>
                            field.onChange(
                              field.value.filter((_, idx) => idx !== i)
                            )
                          }
                          className="text-sm font-bold"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Featured Image */}
        <FormField
          control={form.control}
          name="featuredImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image</FormLabel>
              <FormControl>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      field.onChange(file);
                      if (file) {
                        setFeaturedImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-sm text-gray-900 dark:text-gray-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100
                      dark:file:bg-purple-900 dark:file:text-purple-300
                      dark:hover:file:bg-purple-800
                      cursor-pointer"
                  />
                  {field.value && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {field.value.name}
                    </p>
                  )}
                  {featuredImagePreview && (
                    <div className="mt-2">
                      <NextImage
                        src={featuredImagePreview}
                        alt="Featured preview"
                        width={128}
                        height={128}
                        className="w-32 h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional Photos */}
        <FormField
          control={form.control}
          name="additionalImages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Accommodation Photos</FormLabel>
              <FormControl>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      field.onChange(files);
                      if (files.length > 0) {
                        setAdditionalImagePreviews(
                          files.map((f) => URL.createObjectURL(f))
                        );
                      }
                    }}
                    className="block w-full text-sm text-gray-900 dark:text-gray-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100
                      dark:file:bg-purple-900 dark:file:text-purple-300
                      dark:hover:file:bg-purple-800
                      cursor-pointer"
                  />
                  {field.value.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {field.value.length} file
                      {field.value.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                  {additionalImagePreviews.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {additionalImagePreviews.map((preview, idx) => (
                        <NextImage
                          key={idx}
                          src={preview}
                          alt={`Additional preview ${idx + 1}`}
                          width={96}
                          height={96}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ──────────── Rooms Table ──────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">Individual Rooms</h3>
            <Button
              type="button"
              onClick={() =>
                append({
                  id: uuidv4(),
                  name: "",
                  description: "",
                  doorlockId: "",
                  images: []
                })
              }
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add another room
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-5 gap-4 items-start border p-3 rounded"
              >
                {/* Room Number */}
                <Controller
                  name={`rooms.${idx}.name`}
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-semibold">
                        Number
                      </label>
                      <input
                        {...field}
                        className="mt-1 block w-full border rounded px-2 py-1"
                      />
                    </div>
                  )}
                />

                {/* Description */}
                <Controller
                  name={`rooms.${idx}.description`}
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-semibold">
                        Description
                      </label>
                      <textarea
                        {...field}
                        rows={2}
                        className="mt-1 block w-full border rounded px-2 py-1"
                        placeholder="(Optional) Enter room description…"
                      />
                    </div>
                  )}
                />

                {/* Doorlock ID */}
                <Controller
                  name={`rooms.${idx}.doorlockId`}
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-semibold">
                        Doorlock ID
                      </label>
                      <input
                        {...field}
                        className="mt-1 block w-full border rounded px-2 py-1"
                      />
                    </div>
                  )}
                />

                {/* Images */}
                <Controller
                  name={`rooms.${idx}.images`}
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-semibold">
                        Images
                      </label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) =>
                          field.onChange(Array.from(e.target.files || []))
                        }
                        className="mt-1 block w-full text-sm text-gray-900 dark:text-gray-300
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-purple-50 file:text-purple-700
                          hover:file:bg-purple-100
                          dark:file:bg-purple-900 dark:file:text-purple-300
                          dark:hover:file:bg-purple-800
                          cursor-pointer"
                      />
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                        {field.value.length} file
                        {field.value.length !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                  )}
                />

                {/* Remove Row */}
                <div className="flex items-center justify-center h-full pt-6">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Remove room"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* ────────────────────────────────────── */}

        {/* Buttons */}
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? "Uploading..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

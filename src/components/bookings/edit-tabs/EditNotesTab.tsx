"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  noteType: string;
  important: boolean;
}

interface EditNotesTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  onUpdate: (data: Partial<EditBookingFormData>) => void;
}

const EditNotesTab: React.FC<EditNotesTabProps> = ({ reservationData }) => {
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch notes when component mounts
  useEffect(() => {
    const fetchNotes = async () => {
      if (!reservationData?.id) return;

      try {
        setIsFetching(true);
        const response = await fetch(
          `/api/reservations/${reservationData.id}/notes`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch notes");
        }

        const data = await response.json();
        setNotes(data.notes || []);
      } catch (error) {
        console.error("Error fetching notes:", error);
        toast({
          title: "Error",
          description: "Failed to load notes",
          variant: "destructive"
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchNotes();
  }, [reservationData?.id, toast]);

  const handleSubmitNote = async () => {
    if (!newNote.trim() || !reservationData?.id) return;

    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/reservations/${reservationData.id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: newNote.trim(),
            noteType: "INTERNAL",
            important: false
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save note");
      }

      const data = await response.json();

      // Add the new note to the list
      setNotes([data.note, ...notes]);
      setNewNote("");

      toast({
        title: "Success",
        description: "Note added successfully"
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim() || !reservationData?.id) return;

    try {
      const response = await fetch(
        `/api/reservations/${reservationData.id}/notes/${noteId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: editingContent.trim()
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const data = await response.json();

      // Update the note in the list
      setNotes(notes.map((note) => (note.id === noteId ? data.note : note)));
      setEditingNoteId(null);
      setEditingContent("");

      toast({
        title: "Success",
        description: "Note updated successfully"
      });
    } catch (error) {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId || !reservationData?.id) return;

    try {
      const response = await fetch(
        `/api/reservations/${reservationData.id}/notes/${deleteNoteId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      // Remove the note from the list
      setNotes(notes.filter((note) => note.id !== deleteNoteId));
      setDeleteNoteId(null);

      toast({
        title: "Success",
        description: "Note deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Note */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Add Note
        </h3>

        <div className="space-y-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add optional notes here..."
            className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff] placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitNote}
              disabled={!newNote.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "SAVING..." : "SUBMIT NOTE"}
            </Button>
          </div>
        </div>
      </div>

      {/* Notes History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-visible">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Notes History
        </h3>

        {isFetching ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No notes added yet.
          </p>
        ) : (
          <div className="space-y-4 overflow-visible">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border-l-4 border-purple-500 bg-gray-50 dark:!bg-gray-700/50 p-4 rounded-r-lg overflow-visible relative"
              >
                <div className="flex items-center justify-between bg-gray-50 dark:!bg-transparent gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">
                        {note.author}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        at{" "}
                        {new Date(note.createdAt).toLocaleString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </span>
                      {note.important && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded-full">
                          Important
                        </span>
                      )}
                    </div>

                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff] text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveEdit(note.id)}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                        {note.content}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="!z-[99999] min-w-[120px]"
                        sideOffset={5}
                        style={{ zIndex: 99999 }}
                      >
                        <DropdownMenuItem
                          onClick={() => handleEditNote(note)}
                          className="cursor-pointer"
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteNoteId(note.id)}
                          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Types Info */}
      {/* <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Note Types
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">INTERNAL:</span> Staff only
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">GUEST_REQUEST:</span> Guest requests
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">MAINTENANCE:</span> Room issues
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">HOUSEKEEPING:</span> Cleaning notes
          </div>
        </div>
      </div> */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditNotesTab;

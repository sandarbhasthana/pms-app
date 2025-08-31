"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CogIcon } from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";

interface Note {
  id: number;
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

const EditNotesTab: React.FC<EditNotesTabProps> = ({
  // reservationData: _reservationData,
  // formData: _formData,
  // onUpdate: _onUpdate
}) => {
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);

  const handleSubmitNote = () => {
    if (!newNote.trim()) return;

    const note = {
      id: Date.now(),
      content: newNote,
      author: "Current User", // Will be replaced with actual user
      createdAt: new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }),
      noteType: "INTERNAL",
      important: false
    };

    setNotes([note, ...notes]);
    setNewNote("");

    // TODO: API call to save note
    console.log("Saving note:", note);
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
            className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:!text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitNote}
              disabled={!newNote.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SUBMIT NOTE
            </Button>
          </div>
        </div>
      </div>

      {/* Notes History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Notes History
        </h3>

        {notes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No notes added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border-l-4 border-purple-500 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-r-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">
                        {note.author}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        at {note.createdAt}
                      </span>
                      {note.important && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded-full">
                          Important
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                  <div className="ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <CogIcon className="h-4 w-4" />
                    </Button>
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

      {/* Placeholder Notice */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <p className="text-purple-800 dark:text-purple-200 text-sm">
          <strong>Note:</strong> This is a placeholder implementation. Full
          notes functionality with backend persistence and note types will be
          implemented according to the Folio Creation Plan.
        </p>
      </div>
    </div>
  );
};

export default EditNotesTab;

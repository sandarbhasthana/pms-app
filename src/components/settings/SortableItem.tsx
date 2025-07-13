// components/settings/SortableItem.tsx

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";
import { MoveVertical } from "lucide-react";

interface Props {
  id: string;
  children: ReactNode;
}

export const SortableItem = ({ id, children }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`transition-shadow duration-200 ${
        isDragging ? "shadow-md" : ""
      } h-12`}
    >
      <td className="cursor-grab px-1.5 w-[2%]" {...listeners}>
        <MoveVertical className="w-4 h-4 text-purple-600 dark:text-purple-400 text-center" />
      </td>
      {children}
    </tr>
  );
};

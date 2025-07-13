// components/settings/GrabHandle.tsx
import { GripVertical } from "lucide-react";

export function GrabHandle() {
  return (
    <div className="cursor-grab text-gray-400 hover:text-gray-600">
      <GripVertical className="h-4 w-4" />
    </div>
  );
}

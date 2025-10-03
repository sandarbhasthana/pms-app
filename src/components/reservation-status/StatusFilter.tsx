"use client";

import React, { useState } from 'react';
import { ReservationStatus } from '@prisma/client';
import { STATUS_CONFIG } from '@/types/reservation-status';
import StatusBadge from './StatusBadge';
import { 
  FunnelIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface StatusFilterProps {
  selectedStatuses: ReservationStatus[];
  onStatusChange: (statuses: ReservationStatus[]) => void;
  className?: string;
  showLabel?: boolean;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatuses,
  onStatusChange,
  className = '',
  showLabel = true
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const allStatuses = Object.keys(STATUS_CONFIG) as ReservationStatus[];

  const handleStatusToggle = (status: ReservationStatus) => {
    const isSelected = selectedStatuses.includes(status);
    
    if (isSelected) {
      // Remove status from selection
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      // Add status to selection
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const handleSelectAll = () => {
    onStatusChange(allStatuses);
  };

  const handleClearAll = () => {
    onStatusChange([]);
  };

  const getFilterLabel = () => {
    if (selectedStatuses.length === 0) {
      return 'All Statuses';
    }
    if (selectedStatuses.length === 1) {
      return STATUS_CONFIG[selectedStatuses[0]].label;
    }
    if (selectedStatuses.length === allStatuses.length) {
      return 'All Statuses';
    }
    return `${selectedStatuses.length} Selected`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Status:
        </span>
      )}
      
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-sm justify-between min-w-32 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4" />
              <span>{getFilterLabel()}</span>
            </div>
            {selectedStatuses.length > 0 && selectedStatuses.length < allStatuses.length && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {selectedStatuses.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="start" 
          className="w-64 z-[10000]"
          sideOffset={5}
        >
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Filter by Status</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-6 px-2 text-xs"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs"
              >
                None
              </Button>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {allStatuses.map((status) => {
            const isSelected = selectedStatuses.includes(status);
            const config = STATUS_CONFIG[status];
            
            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusToggle(status)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <StatusBadge 
                    status={status} 
                    size="sm" 
                    showIcon={true}
                    showLabel={false}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{config.label}</span>
                    <span className="text-xs text-gray-500">{config.description}</span>
                  </div>
                </div>
                
                {isSelected && (
                  <CheckIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                )}
              </DropdownMenuItem>
            );
          })}
          
          {selectedStatuses.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearAll}
                className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Active filter badges */}
      {selectedStatuses.length > 0 && selectedStatuses.length < allStatuses.length && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedStatuses.map((status) => (
            <div
              key={status}
              className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full text-xs"
            >
              <StatusBadge 
                status={status} 
                size="sm" 
                showIcon={true}
                showLabel={false}
                className="!px-0 !py-0 !bg-transparent"
              />
              <span>{STATUS_CONFIG[status].label}</span>
              <button
                onClick={() => handleStatusToggle(status)}
                className="ml-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                title='Statu Toggle'
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusFilter;

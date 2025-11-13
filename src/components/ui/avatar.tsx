// File: src/components/ui/avatar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Avvvatars from "avvvatars-react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** User's email for avatar generation */
  email?: string | null;
  /** User's name for avatar generation and display */
  name?: string | null;
  /** Custom image URL (overrides generated avatar) */
  src?: string | null;
  /** Size of the avatar */
  size?: "sm" | "md" | "lg" | "xl";
  /** Custom size in pixels (overrides size prop) */
  customSize?: number;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg"
};

const sizePx = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, email, name, src, size = "md", customSize, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    const avatarSize = customSize || sizePx[size];
    const sizeClass = customSize
      ? `h-[${customSize}px] w-[${customSize}px]`
      : sizeClasses[size];

    // Use custom image if provided
    const hasCustomImage = src && !imageError;

    // Get value for avvvatars (prefer email, fallback to name)
    const avvvatarsValue = email || name || "default";

    // Get display value (first 2 letters of name if available)
    const getDisplayValue = () => {
      if (!name) return undefined;
      const names = name.trim().split(" ");
      if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase();
      }
      return (
        names[0].charAt(0) + names[names.length - 1].charAt(0)
      ).toUpperCase();
    };

    const handleImageError = () => {
      setImageError(true);
      setImageLoaded(false);
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
      setImageError(false);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0",
          sizeClass,
          className
        )}
        style={{
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          minWidth: `${avatarSize}px`,
          minHeight: `${avatarSize}px`,
          maxWidth: `${avatarSize}px`,
          maxHeight: `${avatarSize}px`
        }}
        {...props}
      >
        {hasCustomImage ? (
          <Image
            src={src!}
            alt={name || "User avatar"}
            width={avatarSize}
            height={avatarSize}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onError={handleImageError}
            onLoad={handleImageLoad}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center avatar-wrapper">
            <Avvvatars
              value={avvvatarsValue}
              displayValue={getDisplayValue()}
              style="character"
              size={avatarSize}
              radius={avatarSize}
            />
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

// Compatibility components for shadcn/ui pattern
export const AvatarImage = React.forwardRef<
  HTMLImageElement,
  Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }
>(({ className, alt, width = 40, height = 40, src, ...props }, ref) => {
  // Ensure src is defined for Next.js Image component
  if (!src) {
    return null;
  }

  return (
    <Image
      ref={ref}
      className={cn("aspect-square h-full w-full object-cover", className)}
      alt={alt}
      width={width}
      height={height}
      src={src}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

// Additional avatar variants for specific use cases
export const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    max?: number;
    size?: AvatarProps["size"];
  }
>(({ className, children, max = 3, size = "md", ...props }, ref) => {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  return (
    <div ref={ref} className={cn("flex -space-x-2", className)} {...props}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white dark:ring-gray-900 rounded-full"
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, {
                size
              })
            : child}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium ring-2 ring-white dark:ring-gray-900",
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
});

AvatarGroup.displayName = "AvatarGroup";

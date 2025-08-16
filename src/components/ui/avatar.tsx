// File: src/components/ui/avatar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  getGravatarUrl,
  getUserInitials,
  getInitialsBackgroundColor
} from "@/lib/gravatar";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** User's email for gravatar */
  email?: string | null;
  /** User's name for initials fallback */
  name?: string | null;
  /** Custom image URL (overrides gravatar) */
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

    // Determine the image source
    const imageSrc = React.useMemo(() => {
      if (src) return src;
      if (email && !imageError) return getGravatarUrl(email, avatarSize);
      return null;
    }, [src, email, avatarSize, imageError]);

    // Get initials and background color for fallback
    const initials = getUserInitials(name);
    const backgroundColor = getInitialsBackgroundColor(name);

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
          "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800",
          sizeClass,
          className
        )}
        style={!imageSrc || imageError ? { backgroundColor } : undefined}
        {...props}
      >
        {imageSrc && !imageError && (
          <Image
            src={imageSrc}
            alt={name || "User avatar"}
            width={avatarSize}
            height={avatarSize}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onError={handleImageError}
            onLoad={handleImageLoad}
            unoptimized={imageSrc.startsWith("https://www.gravatar.com")}
          />
        )}

        {(!imageSrc || imageError || !imageLoaded) && (
          <span
            className={cn(
              "font-medium text-white select-none",
              customSize ? `text-[${Math.floor(customSize * 0.4)}px]` : ""
            )}
          >
            {initials}
          </span>
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

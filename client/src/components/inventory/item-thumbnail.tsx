import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ItemThumbnailProps {
  itemId: number;
  itemName: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export default function ItemThumbnail({ 
  itemId, 
  itemName, 
  className = "w-full h-full object-cover",
  fallbackIcon
}: ItemThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  // Fetch thumbnail URL from API
  const { data: thumbnailData, isLoading } = useQuery({
    queryKey: [`/api/items/${itemId}/thumbnail`],
    enabled: !!itemId
  });

  const thumbnailUrl = thumbnailData?.thumbnail;

  // Reset error state when thumbnail URL changes
  useEffect(() => {
    setImageError(false);
  }, [thumbnailUrl]);

  const handleImageError = () => {
    setImageError(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-pulse bg-gray-200 w-full h-full rounded"></div>
      </div>
    );
  }

  // Show image if we have a valid URL and no error
  if (thumbnailUrl && !imageError) {
    return (
      <img
        src={thumbnailUrl}
        alt={itemName}
        className={className}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  // Fallback to icon
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      {fallbackIcon || <Package className="w-12 h-12 text-gray-400" />}
    </div>
  );
}
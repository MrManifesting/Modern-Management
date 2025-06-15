import React, { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ImageCarouselProps = {
  images: string[];
  alt: string;
  className?: string;
};

export default function ImageCarousel({ images, alt, className = "" }: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [thumbnailsExpanded, setThumbnailsExpanded] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // If there are no images, show a placeholder
  if (!images || !images.length) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gray-200 ${className}`}>
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  // Helper function to get image URL with proper fallback
  const getImageUrl = (imageUrl: string) => {
    // Handle Shopify CDN URLs
    if (imageUrl?.includes('shopify.com') || imageUrl?.includes('cdn.shopify.com')) {
      return imageUrl;
    }
    // Handle local media files
    if (imageUrl?.startsWith('/media/') || imageUrl?.startsWith('/uploads/')) {
      return imageUrl;
    }
    // Handle external URLs
    if (imageUrl?.startsWith('http')) {
      return imageUrl;
    }
    // Fallback for relative paths
    return `/media/${imageUrl}`;
  };

  // If there's only one image, show it without the carousel
  if (images.length === 1) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img 
          src={images[0]} 
          alt={alt} 
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Main carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((src, index) => (
            <div className="relative flex-[0_0_100%]" key={index}>
              <img 
                src={src} 
                alt={`${alt} (${index + 1} of ${images.length})`} 
                className="h-full w-full object-cover"
              />
              {/* Image counter badge */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {index + 1}/{images.length}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <button
        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-md hover:bg-white transition-colors"
        onClick={scrollPrev}
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-md hover:bg-white transition-colors"
        onClick={scrollNext}
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      
      {/* View all thumbnails button */}
      <button
        className="absolute bottom-2 right-2 bg-white/80 rounded-full p-1 shadow-md hover:bg-white transition-colors"
        onClick={() => setThumbnailsExpanded(!thumbnailsExpanded)}
        aria-label="Toggle thumbnails"
      >
        <ExternalLink className="h-4 w-4" />
      </button>
      
      {/* Thumbnails */}
      <div className={`absolute bottom-0 left-0 right-0 bg-black/60 p-2 transition-transform ${thumbnailsExpanded ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex space-x-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={index}
              className={`flex-shrink-0 h-16 w-16 border-2 ${index === selectedIndex ? 'border-primary-500' : 'border-transparent'}`}
              onClick={() => emblaApi?.scrollTo(index)}
            >
              <img src={src} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
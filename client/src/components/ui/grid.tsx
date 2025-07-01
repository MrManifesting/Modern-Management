import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GridProps {
  children: ReactNode;
  cols?: number;
  gap?: number;
  rowGap?: number;
  colGap?: number;
  className?: string;
  mdCols?: number;
  lgCols?: number;
  xlCols?: number;
}

interface CellProps {
  children: ReactNode;
  span?: number;
  mdSpan?: number;
  lgSpan?: number;
  xlSpan?: number;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({ 
  children, 
  cols = 1, 
  gap = 4, 
  rowGap, 
  colGap,
  mdCols,
  lgCols,
  xlCols,
  className 
}) => {
  const getColsClass = () => {
    const baseClass = `grid-cols-${cols}`;
    const mdClass = mdCols ? `md:grid-cols-${mdCols}` : '';
    const lgClass = lgCols ? `lg:grid-cols-${lgCols}` : '';
    const xlClass = xlCols ? `xl:grid-cols-${xlCols}` : '';
    
    return [baseClass, mdClass, lgClass, xlClass].filter(Boolean).join(' ');
  };
  
  const getGapClass = () => {
    if (rowGap !== undefined && colGap !== undefined) {
      return `gap-x-${colGap} gap-y-${rowGap}`;
    }
    return `gap-${gap}`;
  };
  
  return (
    <div className={cn(
      'grid',
      getColsClass(),
      getGapClass(),
      className
    )}>
      {children}
    </div>
  );
};

export const Cell: React.FC<CellProps> = ({ 
  children, 
  span = 1, 
  mdSpan, 
  lgSpan, 
  xlSpan,
  className 
}) => {
  const getSpanClass = () => {
    const baseClass = `col-span-${span}`;
    const mdClass = mdSpan ? `md:col-span-${mdSpan}` : '';
    const lgClass = lgSpan ? `lg:col-span-${lgSpan}` : '';
    const xlClass = xlSpan ? `xl:col-span-${xlSpan}` : '';
    
    return [baseClass, mdClass, lgClass, xlClass].filter(Boolean).join(' ');
  };
  
  return (
    <div className={cn(
      getSpanClass(),
      className
    )}>
      {children}
    </div>
  );
};
import { ArrowUp } from "lucide-react";
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeValue?: string | number;
  changeText?: string;
  isLoading?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  changeValue,
  changeText = "vs last month",
  isLoading = false,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {isLoading ? (
              <div className="mt-1 h-8 w-20 animate-pulse rounded bg-gray-200"></div>
            ) : (
              <h3 className="mt-1 text-2xl font-semibold text-gray-800">
                {value}
              </h3>
            )}
          </div>
          <div className={`rounded-full ${iconBgColor} p-3 ${iconColor}`}>
            {icon}
          </div>
        </div>
        
        {changeValue && (
          <div className="mt-4 flex items-center">
            <span className="flex items-center text-sm font-medium text-green-600">
              <ArrowUp className="mr-1 h-4 w-4" />
              {changeValue}
            </span>
            <span className="ml-2 text-xs text-gray-500">{changeText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

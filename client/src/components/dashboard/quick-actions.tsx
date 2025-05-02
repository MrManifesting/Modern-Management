import { 
  Camera, 
  FileText, 
  Palette, 
  Zap 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [_, navigate] = useLocation();

  const actions = [
    {
      title: "Scan New Item",
      icon: <Camera className="h-6 w-6" />,
      bgColor: "bg-primary-100",
      textColor: "text-primary-500",
      onClick: () => navigate("/inventory?action=new"),
    },
    {
      title: "Create Bulk Listing",
      icon: <FileText className="h-6 w-6" />,
      bgColor: "bg-blue-100",
      textColor: "text-blue-500",
      onClick: () => navigate("/marketplace?action=bulk"),
    },
    {
      title: "Generate Price Sheet",
      icon: <Zap className="h-6 w-6" />,
      bgColor: "bg-amber-100",
      textColor: "text-amber-500",
      onClick: () => navigate("/export?type=price-sheet"),
    },
  ];

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 hover:bg-gray-100 transition-colors"
            >
              <div className={`rounded-full ${action.bgColor} p-3 ${action.textColor}`}>
                {action.icon}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">
                {action.title}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

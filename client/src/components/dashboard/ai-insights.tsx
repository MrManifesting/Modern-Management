import { Lightbulb, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AIInsights() {
  // These would typically come from an API, but for now using static data
  const titleSuggestions = [
    "Vintage 1970s Polaroid SX-70 Land Camera - Tested & Working",
    "Retro Polaroid SX-70 Camera - Vintage Photography - Collectible",
    "Original Polaroid Land Camera SX-70 - Instant Film Photography",
  ];

  const keywords = [
    "vintage camera",
    "polaroid sx-70",
    "instant film",
    "land camera",
    "1970s camera",
    "retro photography",
    "analog camera",
    "collectible camera",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI SEO Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg bg-purple-50 p-4">
            <div className="flex items-center">
              <Lightbulb className="h-5 w-5 text-purple-500" />
              <h3 className="ml-2 text-sm font-medium text-purple-700">
                Generated Title Suggestions
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              {titleSuggestions.map((title, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-white p-3"
                >
                  <p className="text-sm text-gray-700">{title}</p>
                  <Button variant="outline" size="sm" className="bg-primary-50 text-primary-600 hover:bg-primary-100 border-primary-200">
                    Use
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500" />
              <h3 className="ml-2 text-sm font-medium text-blue-700">
                Keyword Recommendations
              </h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

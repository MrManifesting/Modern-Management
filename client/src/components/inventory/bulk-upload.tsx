import { useState, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, X, ArrowRight, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BulkUploadProps {
  onComplete: (items: Array<{ images: File[] }>) => void;
}

export default function BulkUpload({ onComplete }: BulkUploadProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [groupedImages, setGroupedImages] = useState<Record<string, File[]>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // File dropzone setup
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    onDrop: (acceptedFiles) => {
      setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    },
  });

  // Group images by default (one image per group)
  useMemo(() => {
    const newGroups: Record<string, File[]> = {};
    
    files.forEach((file, index) => {
      const groupId = `group-${index}`;
      if (!groupedImages[groupId]) {
        newGroups[groupId] = [file];
      }
    });
    
    setGroupedImages(prev => ({...prev, ...newGroups}));
  }, [files]);

  // Get all group IDs
  const groupIds = Object.keys(groupedImages);
  
  // Memory cleanup for image URLs
  useEffect(() => {
    return () => {
      // Clean up object URLs on component unmount
      Object.values(groupedImages).forEach(files => {
        files.forEach(file => {
          if ((file as any).preview) {
            URL.revokeObjectURL((file as any).preview);
          }
        });
      });
    };
  }, [groupedImages]);
  
  // Get current group preview URLs
  const getGroupPreviews = (groupId: string) => {
    return groupedImages[groupId]?.map(file => {
      // Create and cache preview URL if it doesn't exist
      if (!(file as any).preview) {
        (file as any).preview = URL.createObjectURL(file);
      }
      return (file as any).preview;
    }) || [];
  };
  
  // Remove a file from a group
  const removeFileFromGroup = (groupId: string, fileIndex: number) => {
    const newGroups = {...groupedImages};
    newGroups[groupId] = newGroups[groupId].filter((_, i) => i !== fileIndex);
    
    // Remove group if empty
    if (newGroups[groupId].length === 0) {
      delete newGroups[groupId];
    }
    
    setGroupedImages(newGroups);
  };
  
  // Create a new group
  const createNewGroup = () => {
    const newGroupId = `group-${Date.now()}`;
    setGroupedImages(prev => ({...prev, [newGroupId]: []}));
    setActiveGroup(newGroupId);
  };
  
  // Move a file to another group
  const moveFileToGroup = (fileIndex: number, fromGroup: string, toGroup: string) => {
    if (fromGroup === toGroup) return;
    
    const newGroups = {...groupedImages};
    const fileToMove = newGroups[fromGroup][fileIndex];
    
    // Add to new group
    newGroups[toGroup] = [...newGroups[toGroup], fileToMove];
    
    // Remove from old group
    newGroups[fromGroup] = newGroups[fromGroup].filter((_, i) => i !== fileIndex);
    
    // Remove old group if empty
    if (newGroups[fromGroup].length === 0) {
      delete newGroups[fromGroup];
    }
    
    setGroupedImages(newGroups);
  };
  
  // Analyze all groups
  const analyzeGroups = async () => {
    setIsAnalyzing(true);
    const results: Record<string, AIAnalysis> = {};
    
    try {
      // Analyze each group using its first image
      for (const groupId of groupIds) {
        const firstImage = groupedImages[groupId][0];
        
        if (firstImage) {
          const formData = new FormData();
          formData.append("image", firstImage);
          
          try {
            const response = await apiRequest("POST", "/api/analyze-image", formData);
            const analysis = await response.json();
            results[groupId] = analysis;
          } catch (error) {
            console.error(`Error analyzing group ${groupId}:`, error);
            results[groupId] = {
              name: `Item ${groupId}`,
              description: "Failed to analyze this item. Please edit it manually.",
              category: "Other",
            };
          }
        }
      }
      
      setAnalysisResults(results);
      
      toast({
        title: "Analysis complete",
        description: `Successfully analyzed ${Object.keys(results).length} items.`,
      });
    } catch (error) {
      console.error("Error during analysis:", error);
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing your items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Complete the process and send the result back
  const completeProcess = () => {
    const result = groupIds.map(groupId => ({
      images: groupedImages[groupId],
      analysis: analysisResults[groupId] || {
        name: `Item ${groupId}`,
        description: "",
        category: "Other",
      }
    }));
    
    onComplete(result);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            {...getRootProps()} 
            className="mt-1 flex justify-center border-2 border-dashed border-gray-300 rounded-md px-6 pt-5 pb-6"
          >
            <div className="space-y-1 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 hover:text-primary-500">
                  <span>Upload multiple files</span>
                  <input {...getInputProps()} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 10MB - Upload multiple product photos at once
              </p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {files.length} image{files.length !== 1 ? 's' : ''} uploaded
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsPreviewOpen(true)}
                >
                  Group & Preview
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Group and Organize Images</DialogTitle>
          </DialogHeader>
          
          <div className="flex h-[500px]">
            <div className="w-1/4 border-r pr-2 overflow-y-auto">
              <div className="mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={createNewGroup}
                >
                  <Plus className="h-4 w-4 mr-1" /> New Group
                </Button>
              </div>
              
              {groupIds.map((groupId) => (
                <div 
                  key={groupId}
                  className={`p-2 rounded mb-2 cursor-pointer ${activeGroup === groupId ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  onClick={() => setActiveGroup(groupId)}
                >
                  <div className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">
                        {analysisResults[groupId]?.name || `Item ${groupId.split('-')[1]}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {groupedImages[groupId]?.length || 0} photos
                      </span>
                    </div>
                    
                    {analysisResults[groupId]?.suggestedPrice && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-700">
                          {analysisResults[groupId].category || "Uncategorized"}
                        </span>
                        <span className="text-green-600 font-medium">
                          ${analysisResults[groupId].suggestedPrice}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex-1 pl-4">
              {activeGroup && (
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    {analysisResults[activeGroup]?.name || `Item ${activeGroup.split('-')[1]}`}
                  </h3>
                  
                  {analysisResults[activeGroup] && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-700">
                        <span>Category: <span className="font-medium">{analysisResults[activeGroup].category || "Unknown"}</span></span>
                        <span>Condition: <span className="font-medium">{analysisResults[activeGroup].condition || "Unspecified"}</span></span>
                      </div>
                      
                      {analysisResults[activeGroup].suggestedPrice && (
                        <div className="flex items-center space-x-2 bg-green-50 p-2 rounded text-xs border border-green-100">
                          <div className="font-medium text-green-700">Suggested Price: ${analysisResults[activeGroup].suggestedPrice}</div>
                          
                          {analysisResults[activeGroup].description?.includes("Price Range:") && (
                            <div className="text-gray-600">
                              {(analysisResults[activeGroup].description.match(/Price Range:\s*([$\d\-\.]+)/i) || [])[1]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-2">
                    {getGroupPreviews(activeGroup).map((url, index) => (
                      <div key={index} className="relative h-32 w-full">
                        <img
                          src={url}
                          alt={`Preview ${index}`}
                          className="h-full w-full object-cover rounded-md"
                        />
                        <div className="absolute top-0 right-0 flex">
                          <button
                            type="button"
                            onClick={() => removeFileFromGroup(activeGroup, index)}
                            className="bg-white p-1 rounded-full shadow-sm"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Drop area for this group */}
                    {groupIds.length > 1 && (
                      <div className="border-2 border-dashed border-gray-300 rounded-md h-32 flex flex-col items-center justify-center">
                        <p className="text-xs text-gray-500 text-center px-2">
                          Drag images from other groups here
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {groupIds.length > 1 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium mb-2">Move to another group:</h4>
                      <div className="flex flex-wrap gap-2">
                        {groupIds
                          .filter(id => id !== activeGroup)
                          .map(groupId => (
                            <Button 
                              key={groupId} 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const fileIndexToMove = 0; // First file
                                moveFileToGroup(fileIndexToMove, activeGroup, groupId);
                              }}
                            >
                              {groupId.split('-')[1]} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {!activeGroup && groupIds.length > 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500">Select a group from the left</p>
                </div>
              )}
              
              {groupIds.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500">No images uploaded yet</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={analyzeGroups}
              disabled={groupIds.length === 0 || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze All Items'}
            </Button>
            <Button
              onClick={completeProcess}
              disabled={groupIds.length === 0 || Object.keys(analysisResults).length === 0}
            >
              <Check className="h-4 w-4 mr-1" /> Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
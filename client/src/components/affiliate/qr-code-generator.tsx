import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const qrCodeSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  description: z.string().optional(),
  type: z.enum(['product', 'website', 'event', 'other']),
  customData: z.string().optional(),
});

type QrCodeFormValues = z.infer<typeof qrCodeSchema>;

interface QrCodeGeneratorProps {
  affiliateId: number;
  onGenerate?: () => void;
}

export function QrCodeGenerator({ affiliateId, onGenerate }: QrCodeGeneratorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<QrCodeFormValues>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'product',
      customData: '',
    },
  });

  async function onSubmit(values: QrCodeFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/affiliates/${affiliateId}/qrcodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const result = await response.json();
      
      toast({
        title: 'QR Code Generated',
        description: 'Your new QR code has been created successfully',
      });
      
      // Reset form
      form.reset();
      
      // Notify parent component
      if (onGenerate) {
        onGenerate();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate New QR Code</CardTitle>
        <CardDescription>
          Create a QR code for your affiliate marketing campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Sale 2025" {...field} />
                  </FormControl>
                  <FormDescription>
                    A name to identify this QR code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="For social media campaign" {...field} />
                  </FormControl>
                  <FormDescription>
                    Additional details about this QR code's purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    What will this QR code be used for?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Data (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Any custom tracking data" {...field} />
                  </FormControl>
                  <FormDescription>
                    Custom information to include with this QR code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate QR Code'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, PlusCircle, Clock, CheckSquare, XSquare, Users, Tag, Package } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  time?: string;
  type: 'intake' | 'marketing' | 'meeting' | 'other';
  description?: string;
  participants?: string[];
  completed?: boolean;
}

// Initialize with some example events
const initialEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'New Product Intake',
    date: new Date(),
    time: '10:00 AM',
    type: 'intake',
    description: 'Receiving new Exotic Strains from Tree Mason',
    participants: ['John D.', 'Emma C.'],
  },
  {
    id: 2,
    title: 'Marketing Team Meeting',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    time: '2:00 PM',
    type: 'meeting',
    description: 'Discuss Q2 marketing strategy',
    participants: ['John D.', 'Sarah M.', 'Mike T.'],
  },
  {
    id: 3,
    title: 'Website SEO Update',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    time: '11:00 AM',
    type: 'marketing',
    description: 'Update product descriptions and meta tags',
    participants: ['Sarah M.'],
  },
];

export function CompanyCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    date: new Date(),
    time: '',
    type: 'meeting' as 'intake' | 'marketing' | 'meeting' | 'other',
    description: '',
    participants: [],
  });

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      return;
    }

    const event: CalendarEvent = {
      id: Math.max(0, ...events.map(e => e.id)) + 1,
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      type: newEvent.type as 'intake' | 'marketing' | 'meeting' | 'other',
      description: newEvent.description,
      participants: newEvent.participants,
      completed: false,
    };

    setEvents([...events, event]);
    setIsAddEventDialogOpen(false);
    setNewEvent({
      title: '',
      date: new Date(),
      time: '',
      type: 'meeting',
      description: '',
      participants: [],
    });
  };

  const toggleEventCompletion = (id: number) => {
    setEvents(events.map(event => 
      event.id === id ? { ...event, completed: !event.completed } : event
    ));
  };

  const deleteEvent = (id: number) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'intake':
        return <Package className="h-4 w-4 text-green-500" />;
      case 'marketing':
        return <Tag className="h-4 w-4 text-purple-500" />;
      case 'meeting':
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return <CalendarIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'intake':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30';
      case 'marketing':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30';
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30';
    }
  };

  // Filter events for the selected date
  const selectedDateEvents = selectedDate 
    ? events.filter(
        event => event.date.toDateString() === selectedDate.toDateString()
      ).sort((a, b) => {
        // Sort by time if available
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return 0;
      })
    : [];

  return (
    <Card className="border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-amber-500" />
          Company Calendar
        </CardTitle>
        <CardDescription>
          Schedule and manage intakes, meetings, and company events
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Calendar */}
          <div className="p-4 border-r border-gray-100 dark:border-gray-800">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="mx-auto"
              // Highlight dates with events
              modifiers={{
                booked: events.map(event => new Date(event.date))
              }}
              modifiersStyles={{
                booked: { 
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  borderColor: 'rgba(234, 179, 8, 0.3)',
                }
              }}
            />
            <div className="mt-4 flex justify-center">
              <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Calendar Event</DialogTitle>
                    <DialogDescription>
                      Create a new event or schedule an intake
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="event-title">Event Title</Label>
                      <Input
                        id="event-title"
                        placeholder="Enter event title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Event Date</Label>
                        <Calendar
                          mode="single"
                          selected={newEvent.date}
                          onSelect={(date) => setNewEvent({ ...newEvent, date })}
                          className="border rounded-md p-3"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="event-time">Time (Optional)</Label>
                        <Input
                          id="event-time"
                          placeholder="e.g., 2:00 PM"
                          value={newEvent.time}
                          onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        />
                        <Label htmlFor="event-type" className="mt-4">Event Type</Label>
                        <Select
                          value={newEvent.type || 'meeting'}
                          onValueChange={(value: 'intake' | 'marketing' | 'meeting' | 'other') => setNewEvent({ ...newEvent, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="intake">Product Intake</SelectItem>
                            <SelectItem value="marketing">Marketing Event</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-description">Description (Optional)</Label>
                      <Textarea
                        id="event-description"
                        placeholder="Enter event details"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-participants">Participants (comma separated)</Label>
                      <Input
                        id="event-participants"
                        placeholder="e.g., John D., Emma C."
                        value={newEvent.participants?.join(', ') || ''}
                        onChange={(e) => setNewEvent({ 
                          ...newEvent, 
                          participants: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddEventDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddEvent}>Save Event</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Event List */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-amber-500" />
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </h4>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20">
                {selectedDateEvents.length} Events
              </Badge>
            </div>
            
            {selectedDateEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mb-2 opacity-20" />
                <p>No events scheduled for this date</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setIsAddEventDialogOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[365px] pr-4">
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <Card key={event.id} className={`relative overflow-hidden ${
                      event.completed ? 'opacity-60' : ''
                    }`}>
                      {/* Color strip based on event type */}
                      <div 
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          event.type === 'intake' ? 'bg-green-500' : 
                          event.type === 'marketing' ? 'bg-purple-500' : 
                          event.type === 'meeting' ? 'bg-blue-500' : 
                          'bg-gray-500'
                        }`} 
                      />
                      
                      <CardContent className="p-4 pl-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-base flex items-center gap-2">
                              {getEventTypeIcon(event.type)}
                              {event.title}
                            </h4>
                            
                            {event.time && (
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {event.time}
                              </div>
                            )}
                            
                            {event.description && (
                              <p className="text-sm mt-2">{event.description}</p>
                            )}
                            
                            {event.participants && event.participants.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {event.participants.map(participant => (
                                  <Badge key={participant} variant="outline" className="text-xs">
                                    {participant}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => toggleEventCompletion(event.id)}
                            >
                              {event.completed ? (
                                <CheckSquare className="h-4 w-4 text-green-500" />
                              ) : (
                                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => deleteEvent(event.id)}
                            >
                              <XSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <Badge 
                            variant="outline" 
                            className={getEventTypeBadgeClass(event.type)}
                          >
                            {event.type === 'intake' ? 'Product Intake' : 
                             event.type === 'marketing' ? 'Marketing' : 
                             event.type === 'meeting' ? 'Meeting' : 'Event'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-3 border-t">
        <div className="text-xs text-muted-foreground">
          <Clock className="inline-block h-3 w-3 mr-1" />
          Last updated: {format(new Date(), 'MMM d, h:mm a')}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          View All Events
        </Button>
      </CardFooter>
    </Card>
  );
}
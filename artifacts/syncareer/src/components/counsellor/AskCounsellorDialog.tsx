import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Star, MapPin, DollarSign, ChevronRight, ArrowLeft, User, MessageSquare, Search, CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sendNotification } from '@/utils/notifications';
import { toast } from 'sonner';
import { z } from 'zod';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Counsellor {
  id: string;
  user_id: string;
  full_name: string;
  bio: string | null;
  specialization: string | null;
  hiring_price: number;
  location: string | null;
  avatar_url: string | null;
  average_rating: number;
  review_count: number;
}

interface TimeSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AskCounsellorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const bookingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  contact: z.string().trim().min(1, 'Contact is required').max(200, 'Contact must be less than 200 characters'),
});

type Step = 'form' | 'list' | 'profile' | 'time';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AskCounsellorDialog: React.FC<AskCounsellorDialogProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState<Step>('form');
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState<Counsellor | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Form state
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Time selection state
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    if (open && step === 'list') {
      fetchCounsellors();
    }
  }, [open, step]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('form');
      setUserName('');
      setUserContact('');
      setSelectedCounsellor(null);
      setSearchQuery('');
      setAvailability([]);
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
    }
  }, [open]);

  const fetchCounsellors = async () => {
    setLoading(true);
    try {
      const { data: counsellorsData, error } = await supabase
        .from('counsellor_profiles_public')
        .select('*');

      if (error) throw error;

      if (counsellorsData) {
        const counsellorsWithRatings = await Promise.all(
          counsellorsData.map(async (counsellor) => {
            const { data: reviews } = await supabase
              .from('counsellor_reviews')
              .select('rating')
              .eq('counsellor_id', counsellor.id);

            const ratings = reviews || [];
            const averageRating = ratings.length > 0
              ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
              : 0;

            return {
              ...counsellor,
              average_rating: averageRating,
              review_count: ratings.length,
            } as Counsellor;
          })
        );

        counsellorsWithRatings.sort((a, b) => b.average_rating - a.average_rating);
        setCounsellors(counsellorsWithRatings);
      }
    } catch (error) {
      console.error('Error fetching counsellors:', error);
      toast.error('Failed to load counsellors');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (counsellorId: string) => {
    setLoadingAvailability(true);
    try {
      const { data, error } = await supabase
        .from('counsellor_availability')
        .select('*')
        .eq('counsellor_id', counsellorId)
        .eq('is_available', true);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleFormSubmit = () => {
    const result = bookingSchema.safeParse({ name: userName, contact: userContact });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    setStep('list');
  };

  const handleSelectCounsellor = (counsellor: Counsellor) => {
    setSelectedCounsellor(counsellor);
    setStep('profile');
  };

  const handleProceedToTimeSelection = async () => {
    if (!selectedCounsellor) return;
    await fetchAvailability(selectedCounsellor.id);
    setStep('time');
  };

  const handleBack = () => {
    if (step === 'time') {
      setStep('profile');
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
    } else if (step === 'profile') {
      setStep('list');
    } else if (step === 'list') {
      setStep('form');
    }
  };

  const getAvailableDays = (): number[] => {
    return availability.map(slot => slot.day_of_week);
  };

  const isDateAvailable = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const today = startOfDay(new Date());
    return !isBefore(date, today) && getAvailableDays().includes(dayOfWeek);
  };

  const getTimeSlotsForDate = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    return availability.filter(slot => slot.day_of_week === dayOfWeek);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const handleBook = async () => {
    if (!selectedCounsellor || !selectedDate || !selectedTimeSlot) {
      toast.error('Please select a date and time');
      return;
    }

    setBookingLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in to book a session');
        return;
      }

      const { error } = await supabase
        .from('counsellor_bookings')
        .insert({
          counsellor_id: selectedCounsellor.id,
          user_id: session.user.id,
          user_name: userName,
          user_contact: userContact,
          status: 'pending',
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          scheduled_time: selectedTimeSlot.start_time,
          day_of_week: selectedDate.getDay(),
        });

      if (error) throw error;

      // Notify the counsellor about the new booking request
      const formattedDate = format(selectedDate, 'PPP');
      sendNotification({
        user_id: selectedCounsellor.user_id,
        type: 'booking',
        title: 'New Session Request',
        message: `${userName} has requested a session on ${formattedDate}. Please review and respond.`,
        category: 'booking',
        link: '/counsellor-sessions',
      });

      toast.success('Booking request sent! You will be notified when the counsellor accepts.');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to book session');
    } finally {
      setBookingLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < Math.round(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`}
          />
        ))}
      </div>
    );
  };

  const getStepTitle = () => {
    switch (step) {
      case 'form': return 'Book a Counsellor';
      case 'list': return 'Select a Counsellor';
      case 'profile': return selectedCounsellor?.full_name || 'Counsellor Profile';
      case 'time': return 'Select Date & Time';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'form': return 'Enter your details to find and book a career counsellor.';
      case 'list': return 'Choose from our top-rated career counsellors.';
      case 'profile': return 'View counsellor profile and proceed to book.';
      case 'time': return 'Choose an available time slot for your session.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'form' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: User Info Form */}
          {step === 'form' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact (Email or Phone) *</Label>
                <Input
                  id="contact"
                  value={userContact}
                  onChange={(e) => setUserContact(e.target.value)}
                  placeholder="Enter your email or phone number"
                />
              </div>
              <Button onClick={handleFormSubmit} className="w-full mt-4">
                Find Counsellors
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Counsellor List */}
          {step === 'list' && (
            <div className="flex flex-col h-[400px]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <ScrollArea className="flex-1 pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : counsellors.filter(c => 
                    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.specialization?.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{searchQuery ? 'No counsellors match your search.' : 'No counsellors available at the moment.'}</p>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    {counsellors
                      .filter(c => 
                        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.specialization?.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((counsellor) => (
                    <Card
                      key={counsellor.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectCounsellor(counsellor)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={counsellor.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {counsellor.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold truncate">{counsellor.full_name}</h4>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                                ${counsellor.hiring_price}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {renderStars(counsellor.average_rating)}
                              <span className="text-sm text-muted-foreground">
                                ({counsellor.review_count})
                              </span>
                            </div>
                            {counsellor.specialization && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {counsellor.specialization}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Counsellor Profile */}
          {step === 'profile' && selectedCounsellor && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedCounsellor.avatar_url || ''} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {selectedCounsellor.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedCounsellor.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(selectedCounsellor.average_rating)}
                      <span className="text-sm text-muted-foreground">
                        ({selectedCounsellor.review_count} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {selectedCounsellor.location && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Location
                    </h4>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedCounsellor.location}</span>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">Session Price</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">
                    ${selectedCounsellor.hiring_price}
                  </span>
                </div>

                {selectedCounsellor.bio && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">About</h4>
                    <p className="text-muted-foreground">{selectedCounsellor.bio}</p>
                  </div>
                )}

                {selectedCounsellor.specialization && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Specialization</h4>
                    <p className="text-muted-foreground">{selectedCounsellor.specialization}</p>
                  </div>
                )}

                <Button
                  onClick={handleProceedToTimeSelection}
                  className="w-full"
                  size="lg"
                >
                  Select Time Slot
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </ScrollArea>
          )}

          {/* Step 4: Time Selection */}
          {step === 'time' && selectedCounsellor && (
            <div className="space-y-4 py-4">
              {loadingAvailability ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : availability.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>This counsellor has no availability set yet.</p>
                  <p className="text-sm mt-2">Please try another counsellor or check back later.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Select a Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedTimeSlot(null);
                          }}
                          disabled={(date) => !isDateAvailable(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Available on: {availability.map(slot => DAYS_OF_WEEK[slot.day_of_week]).join(', ')}
                    </p>
                  </div>

                  {selectedDate && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Select a Time
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {getTimeSlotsForDate(selectedDate).map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTimeSlot === slot ? "default" : "outline"}
                            className="w-full"
                            onClick={() => setSelectedTimeSlot(slot)}
                          >
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDate && selectedTimeSlot && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Your Selection</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Date:</span> {format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                          <p><span className="text-muted-foreground">Time:</span> {formatTime(selectedTimeSlot.start_time)} - {formatTime(selectedTimeSlot.end_time)}</p>
                          <p><span className="text-muted-foreground">Counsellor:</span> {selectedCounsellor.full_name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    onClick={handleBook}
                    disabled={bookingLoading || !selectedDate || !selectedTimeSlot}
                    className="w-full"
                    size="lg"
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AskCounsellorDialog;
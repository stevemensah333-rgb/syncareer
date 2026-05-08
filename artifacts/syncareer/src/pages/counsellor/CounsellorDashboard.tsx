import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CounsellorLayout } from '@/components/layout/CounsellorLayout';
import { 
  User, Star, MapPin, Phone, DollarSign, Edit2, Save, X, 
  Calendar, MessageSquare, TrendingUp, Camera, Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ImageCropper } from '@/components/profile/ImageCropper';
import AnimatedSection from '@/components/landing/AnimatedSection';

interface CounsellorDetails {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  country_code: string;
  bio: string | null;
  specialization: string | null;
  hiring_price: number;
  location: string | null;
  avatar_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_id: string;
}

interface Booking {
  id: string;
  user_name: string;
  user_contact: string;
  status: string;
  created_at: string;
}

interface EarningsSummary {
  totalEarnings: number;
  completedSessions: number;
  pendingSessions: number;
}

const CounsellorDashboard = () => {
  const { profile } = useUserProfile();
  const [counsellorDetails, setCounsellorDetails] = useState<CounsellorDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary>({ totalEarnings: 0, completedSessions: 0, pendingSessions: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    bio: '',
    specialization: '',
    hiring_price: 0,
    location: '',
  });

  useEffect(() => {
    fetchCounsellorData();
  }, []);

  const fetchCounsellorData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: details, error: detailsError } = await supabase
        .from('counsellor_details')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (detailsError && detailsError.code !== 'PGRST116') {
        console.error('Error fetching counsellor details:', detailsError);
      }

      if (details) {
        setCounsellorDetails(details as CounsellorDetails);
        setEditForm({
          bio: details.bio || '',
          specialization: details.specialization || '',
          hiring_price: details.hiring_price || 0,
          location: details.location || '',
        });

        // Fetch reviews, bookings, and sessions in parallel
        const [reviewsRes, bookingsRes, sessionsRes] = await Promise.all([
          supabase.from('counsellor_reviews').select('*').eq('counsellor_id', details.id).order('created_at', { ascending: false }),
          supabase.from('counsellor_bookings').select('*').eq('counsellor_id', details.id).order('created_at', { ascending: false }),
          supabase.from('counsellor_sessions').select('status, amount_paid').eq('counsellor_id', details.id),
        ]);

        if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);
        if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
        
        if (sessionsRes.data) {
          const completed = sessionsRes.data.filter(s => s.status === 'completed');
          const pending = sessionsRes.data.filter(s => s.status === 'scheduled');
          const total = completed.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
          setEarnings({ totalEarnings: total, completedSessions: completed.length, pendingSessions: pending.length });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!counsellorDetails) return;
    try {
      const { error } = await supabase
        .from('counsellor_details')
        .update({
          bio: editForm.bio || null,
          specialization: editForm.specialization || null,
          hiring_price: editForm.hiring_price,
          location: editForm.location || null,
        })
        .eq('id', counsellorDetails.id);

      if (error) throw error;
      setCounsellorDetails({ ...counsellorDetails, ...editForm });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5MB'); return; }
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropperOpen(true);
    e.target.value = '';
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!counsellorDetails) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error('Please sign in to upload an avatar'); return; }

      const fileName = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const urlWithCacheBuster = `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase.from('counsellor_details').update({ avatar_url: urlWithCacheBuster }).eq('id', counsellorDetails.id);
      if (updateError) throw updateError;

      setCounsellorDetails({ ...counsellorDetails, avatar_url: urlWithCacheBuster });
      if (imageToCrop) { URL.revokeObjectURL(imageToCrop); setImageToCrop(null); }
      toast.success('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  if (loading) {
    return (
      <CounsellorLayout title="My Portfolio">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CounsellorLayout>
    );
  }

  if (!counsellorDetails) {
    return (
      <CounsellorLayout title="My Portfolio">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Counsellor profile not found. Please complete your onboarding.</p>
        </Card>
      </CounsellorLayout>
    );
  }

  return (
    <CounsellorLayout title="My Portfolio">
      {/* Header Section - Portfolio Style */}
      <AnimatedSection y={20}>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 h-32" />
        <CardContent className="relative pt-0">
          <div className="flex flex-col md:flex-row gap-6 -mt-16">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={counsellorDetails.avatar_url || ''} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {counsellorDetails.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4 text-primary-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </label>
            </div>

            <div className="flex-1 pt-4 md:pt-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-[-0.02em] leading-tight">
                    {counsellorDetails.full_name}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-4 w-4" />
                    {counsellorDetails.country_code} {counsellorDetails.phone_number}
                  </p>
                  {counsellorDetails.location && (
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {counsellorDetails.location}
                    </p>
                  )}
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="rounded-full px-5"
                  data-tour="counsellor-edit"
                >
                  {isEditing ? <X className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 mt-4">
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {averageRating} Rating
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <MessageSquare className="h-4 w-4" />
                  {reviews.length} Reviews
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <Calendar className="h-4 w-4" />
                  {bookings.length} Sessions
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 px-3 py-1" data-tour="counsellor-price">
                  <DollarSign className="h-4 w-4" />
                  ${counsellorDetails.hiring_price}/session
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio & Specialization */}
          <AnimatedSection delay={0.08} y={20}>
          <Card data-tour="counsellor-bio">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                About Me
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell clients about yourself, your experience, and your approach..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                      placeholder="e.g., Career transitions, Tech industry, Leadership coaching"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hiring Price ($/session)</Label>
                      <Input
                        type="number"
                        value={editForm.hiring_price}
                        onChange={(e) => setEditForm({ ...editForm, hiring_price: parseFloat(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        placeholder="e.g., New York, USA"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveProfile} className="w-full rounded-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-foreground">
                    {counsellorDetails.bio || 'No bio added yet. Click "Edit Profile" to add one.'}
                  </p>
                  {counsellorDetails.specialization && (
                    <div className="pt-2">
                      <Label className="text-muted-foreground">Specialization</Label>
                      <p className="text-foreground">{counsellorDetails.specialization}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </AnimatedSection>

          {/* Reviews */}
          <AnimatedSection delay={0.12} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Client Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No reviews yet. Your ratings will appear here after client sessions.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-foreground">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </AnimatedSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Earnings Card */}
          <AnimatedSection delay={0.08} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-primary">${earnings.totalEarnings.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Completed Sessions</span>
                <span className="font-semibold">{earnings.completedSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Upcoming Sessions</span>
                <span className="font-semibold">{earnings.pendingSessions}</span>
              </div>
              {earnings.completedSessions > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg. per Session</span>
                    <span className="font-semibold">${(earnings.totalEarnings / earnings.completedSessions).toFixed(0)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </AnimatedSection>

          {/* Quick Stats */}
          <AnimatedSection delay={0.12} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Average Rating</span>
                <span className="font-semibold flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {averageRating}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Sessions</span>
                <span className="font-semibold">{bookings.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending Requests</span>
                <Badge variant={pendingBookings > 0 ? "default" : "secondary"}>
                  {pendingBookings}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Session Price</span>
                <span className="font-semibold">${counsellorDetails.hiring_price}</span>
              </div>
            </CardContent>
          </Card>
          </AnimatedSection>

          {/* Recent Bookings */}
          <AnimatedSection delay={0.16} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No bookings yet</p>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{booking.user_name}</p>
                        <p className="text-xs text-muted-foreground">{booking.user_contact}</p>
                      </div>
                      <Badge variant={booking.status === 'pending' ? 'outline' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </AnimatedSection>
        </div>
      </div>

      {/* Image Cropper Dialog */}
      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            if (imageToCrop) { URL.revokeObjectURL(imageToCrop); setImageToCrop(null); }
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          aspectRatio={1}
        />
      )}
    </CounsellorLayout>
  );
};

export default CounsellorDashboard;

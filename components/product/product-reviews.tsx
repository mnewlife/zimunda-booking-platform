'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, ThumbsUp, MessageSquare, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

export function ProductReviews({ productId, reviews, averageRating, totalReviews }: ProductReviewsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const { toast } = useToast();

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          interactive ? "cursor-pointer hover:scale-110 transition-transform" : "",
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : i < rating
            ? "fill-yellow-400/50 text-yellow-400"
            : "fill-gray-200 text-gray-200"
        )}
        onClick={() => interactive && onRatingChange && onRatingChange(i + 1)}
      />
    ));
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews && reviews.length > 0) {
      reviews.forEach(review => {
        distribution[review.rating as keyof typeof distribution]++;
      });
    }
    return distribution;
  };

  const filteredReviews = filterRating 
    ? (reviews || []).filter(review => review.rating === filterRating)
    : (reviews || []);

  const handleSubmitReview = async () => {
    if (newReview.rating === 0) {
      toast({
        title: "Please provide a rating",
        description: "Select a star rating before submitting your review.",
        variant: "destructive",
      });
      return;
    }

    if (newReview.comment.trim().length < 10) {
      toast({
        title: "Review too short",
        description: "Please write at least 10 characters for your review.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating: newReview.rating,
          comment: newReview.comment.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback! Your review will appear shortly.",
      });

      setNewReview({ rating: 0, comment: '' });
      setShowReviewForm(false);
      
      // Refresh the page to show the new review
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          <p className="text-gray-600 mt-1">
            {totalReviews || 0} {(totalReviews || 0) === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
          <DialogTrigger asChild>
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              Write Review
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-1">
                  {renderStars(newReview.rating, true, (rating) => 
                    setNewReview(prev => ({ ...prev, rating }))
                  )}
                  <span className="ml-2 text-sm text-gray-600">
                    {newReview.rating > 0 ? `${newReview.rating} star${newReview.rating !== 1 ? 's' : ''}` : 'Select rating'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="review-comment">Your Review</Label>
                <Textarea
                  id="review-comment"
                  placeholder="Share your experience with this product..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  {newReview.comment.length}/500 characters
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || newReview.rating === 0}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowReviewForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rating Summary */}
      {(totalReviews || 0) > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {(averageRating || 0).toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {renderStars(averageRating || 0)}
                </div>
                <p className="text-sm text-gray-600">
                  Based on {totalReviews || 0} {(totalReviews || 0) === 1 ? 'review' : 'reviews'}
                </p>
              </div>
              
              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                  const percentage = (totalReviews || 0) > 0 ? (count / (totalReviews || 1)) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <button
                        onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                        className={cn(
                          "flex items-center gap-1 text-sm hover:text-primary transition-colors",
                          filterRating === rating ? "text-primary font-medium" : "text-gray-600"
                        )}
                      >
                        <span>{rating}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </button>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      {(totalReviews || 0) > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filter by rating:</span>
          <div className="flex gap-2">
            <Button
              variant={filterRating === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRating(null)}
            >
              All
            </Button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <Button
                key={rating}
                variant={filterRating === rating ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRating(rating)}
              >
                {rating} ⭐
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filterRating ? `No ${filterRating}-star reviews yet` : 'No reviews yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {filterRating 
                  ? `Try selecting a different rating filter.`
                  : 'Be the first to share your experience with this product.'}
              </p>
              {!filterRating && (
                <Button onClick={() => setShowReviewForm(true)}>
                  Write the First Review
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.user.image || ''} alt={review.user.name || 'User'} />
                    <AvatarFallback>
                      {review.user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {review.user.name || 'Anonymous User'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 leading-relaxed">
                      {review.comment}
                    </p>
                    
                    {/* Review Actions */}
                    <div className="flex items-center gap-4 pt-2">
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Helpful
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Reviews */}
      {filteredReviews.length > 0 && filteredReviews.length < (totalReviews || 0) && (
        <div className="text-center">
          <Button variant="outline">
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
}
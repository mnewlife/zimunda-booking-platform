'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  ThumbsUp,
  MessageCircle,
  Filter,
  ChevronDown,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  user: {
    name: string;
    avatar?: string;
  };
  helpful?: number;
  verified?: boolean;
}

interface PropertyReviewsProps {
  propertyId: string;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = review.comment.length > 200;
  const displayComment = shouldTruncate && !isExpanded 
    ? review.comment.slice(0, 200) + '...' 
    : review.comment;

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.user.avatar} alt={review.user.name} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{review.user.name}</h4>
                {review.verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified Stay
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <StarRating rating={review.rating} size="sm" />
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            {review.title && (
              <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
            )}
            
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              {displayComment}
            </p>
            
            {shouldTruncate && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0 h-auto text-green-600 hover:text-green-700"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </Button>
            )}
            
            <div className="flex items-center space-x-4 mt-3 pt-3 border-t">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Helpful {review.helpful ? `(${review.helpful})` : ''}
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <MessageCircle className="h-3 w-3 mr-1" />
                Reply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="space-y-2">
      {ratingCounts.map(({ rating, count, percentage }) => (
        <div key={rating} className="flex items-center space-x-3">
          <span className="text-sm font-medium w-8">{rating}</span>
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm text-gray-500 w-8">{count}</span>
        </div>
      ))}
    </div>
  );
}

export function PropertyReviews({ propertyId }: PropertyReviewsProps) {
  // For now, we'll show a placeholder since reviews are not implemented in the database
  const reviews: any[] = [];
  const averageRating = 0;
  const totalReviews = 0;
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [showAll, setShowAll] = useState(false);
  
  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  const displayedReviews = showAll ? sortedReviews : sortedReviews.slice(0, 3);
  const calculatedAverage = averageRating || (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);
  const calculatedTotal = totalReviews || reviews.length;

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500">Be the first to leave a review for this property.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Reviews ({calculatedTotal})</span>
          <div className="flex items-center space-x-2">
            <StarRating rating={Math.round(calculatedAverage)} size="md" />
            <span className="font-semibold">{calculatedAverage.toFixed(1)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Overall Rating</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {calculatedAverage.toFixed(1)}
              </div>
              <StarRating rating={Math.round(calculatedAverage)} size="lg" />
              <p className="text-sm text-gray-500 mt-2">
                Based on {calculatedTotal} review{calculatedTotal !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Rating Breakdown</h3>
            <RatingBreakdown reviews={reviews} />
          </div>
        </div>

        <Separator />

        {/* Sort Controls */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Guest Reviews</h3>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border rounded-md px-2 py-1 bg-white"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* Show More Button */}
        {reviews.length > 3 && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="flex items-center space-x-2"
            >
              <span>{showAll ? 'Show less' : `Show all ${reviews.length} reviews`}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import { useCallback, useState } from "react";
import ReviewsSection, { type Review } from "@/components/organiser/ReviewsSection";
import type { PublicReview } from "@/lib/reviews";

type Props = {
  organiserId: string;
  initialReviews: PublicReview[];
};

export default function OrganiserReviewsClient({ organiserId, initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);

  const onNewReview = useCallback((r: Review) => {
    setReviews((prev) => [r, ...prev]);
  }, []);

  return (
    <div className="mt-10">
      <ReviewsSection
        reviews={reviews}
        organiserId={organiserId}
        loading={false}
        onNewReview={onNewReview}
      />
    </div>
  );
}

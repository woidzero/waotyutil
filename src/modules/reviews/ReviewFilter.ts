import { UserReviewAPI } from "../../api/reviews";

import { settings } from "../../settings";
import { Logger } from "../../utils/logger";

const log = new Logger("review-filter");
const URAPI = new UserReviewAPI();

export class ReviewFilter {
  constructor() { }

  static init() {
    if (window.location.href.includes("/album/")) this.handle();
  }

  static handle() {
    try {
      const reviews = this.getReviews();

      if (!reviews.length) {
        log.warn("no reviews for this album");
        return;
      }

      log.info("all reviews:", reviews);

      // proccess each review
      reviews.forEach(function (review) {
        log.debug(review.content);
      });
    } catch (err: any) {
      log.error(`failed to handle ReviewFilter: ${err}`);
    }
  }

  static getReviews(): UserReview[] {
    const reviews: UserReview[] = [];
    const reviewEl = document.querySelectorAll("#users .albumReviewRow");

    if (reviewEl)
      reviewEl.forEach((el: Element) => {
        const review = URAPI.fromElement(el);
        return reviews.push(review);
      });

    return reviews;
  }
}

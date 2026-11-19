import { Logger } from "../utils/logger";
const log = new Logger("api:reviews");

/**
 * API for constructing user reviews
 */
export class UserReviewAPI {
  constructor() {}

  fromElement(el: Element): UserReview {
    const selectors = [
      ".userReviewName a",
      ".albumReviewText",
      ".ratingBlock .rating",
      ".actionContainer",
    ];

    const [reviewNameEl, reviewTextEl, reviewScoreEl, reviewActionsEl] =
      selectors.map((sel) => {
        const found = el.querySelector(sel);
        if (!found) throw new Error(`unable to find required element: ${sel}`);
        return found;
      });

    const displayName = reviewNameEl.textContent;
    const userName = reviewNameEl.getAttribute("title")!.toLowerCase();

    const content = reviewTextEl.textContent.trim();

    const id = Number(el.getAttribute("id")!.replace("review_", ""));
    const albumId = Number(0);

    const likes = Number(
      reviewActionsEl.querySelector(".showUserReviewLikes")?.textContent || 0,
    );
    const comments = Number(
      reviewActionsEl.querySelector(".comment_count")?.textContent || 0,
    );
    const score = Number(reviewScoreEl.textContent) || null;
    const state = this.getState(el);

    const review = {
      id,
      albumId,
      content,

      author: {
        displayName,
        userName,
      },
      interactions: {
        likes,
        comments,
      },
      score,
      state,
    };

    log.debug(review);
    return review;
  }

  // fromDocument(doc: Document): UserReview {
  //   const selectors = [
  //     ".userReviewByline .userName a",
  //     ".userReviewText",
  //     ".albumCriticScore",
  //     ".albumReviewLinks .review_likes button",
  //     ".albumReviewLinks .likeUserReview"
  //   ];

  //   const [reviewNameEl, reviewTextEl, reviewScoreEl, reviewLikesEl, reviewIDEl] = selectors.map(sel => {
  //     const found = el.querySelector(sel);
  //     if (!found) throw new Error(`unable to find element: ${sel}`);
  //     return found;
  //   });

  //   const displayName: string = reviewNameEl.firstChild?.textContent?.trim() || "";
  //   const userName: string = reviewNameEl.getAttribute("href")!.replace("/user/", "").replace("/", "");
  //   const content = reviewTextEl.textContent?.replace(/[\r\n]+/g, "").trim() || ""

  //   const id = Number(reviewIDEl.getAttribute("data-review-id"));
  //   const userId = Number(0);

  //   const url = ""

  //   return {
  //     id,
  //     content,
  //     author: {
  //       id: userId,
  //       displayName,
  //       userName
  //     },
  //     score: Number(reviewScoreEl.textContent) || null,
  //     likes: Number(reviewLikesEl?.textContent || 0),
  //     date: this.getDate(el),
  //     state: this.getState(el)
  //   }
  // }

  private getLink(el: Element) {
    const urlEl = el.querySelector<HTMLAnchorElement>(
      ".albumReviewLinks .review_comments a",
    );
    if (!urlEl) throw new Error("unable to obtain link element");

    return new URL(urlEl.href);
  }

  private getDate(el: Element) {
    const dateContainer = el.querySelector(".userReviewByline .reviewDate");
    if (!dateContainer) throw new Error("unable to obtain date element");

    const spans = dateContainer.querySelectorAll("span[title]");

    if (spans.length === 0)
      throw new Error("unable to find date spans with title attribute");

    const postedStr = spans[0].getAttribute("title");
    const posted = postedStr ? new Date(postedStr) : new Date(NaN);

    let updated: Date | null = null;

    if (spans.length > 1) {
      const updatedStr = spans[1].getAttribute("title");
      if (updatedStr) {
        updated = new Date(updatedStr);
      }
    }

    if (isNaN(posted.getTime())) {
      throw new Error("unable to parse posted date from title");
    }

    return { posted, updated };
  }

  getState(el: Element): UserReviewState {
    const isLiked = el
      .querySelector(".albumReviewLinks .review_like")!
      .classList.contains("liked");
    const isHidden = false;
    const isShortened = el.querySelector("a[class='gray']") ? true : false;

    return { isLiked, isHidden, isShortened };
  }
}

/**
 * API for constructing critic reviews
 */
export class CriticReviewAPI {
  // wip
}

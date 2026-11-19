interface Publication {
  name: string;
  id: number;
}

interface UserReviewState {
  isLiked: boolean;
  isHidden: boolean;
  isShortened: boolean;
}

interface UserReviewAuthor {
  displayName: string;
  userName: string;
}

interface UserReview {
  id: number;
  albumId: number;
  content: string;
  author: UserReviewAuthor;
  interactions: UserReviewInteractions;
  date?: Date;
  state?: UserReviewState;
  score: number | null;
}

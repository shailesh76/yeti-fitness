export type FeedbackCategory = 'Critical' | 'High' | 'Medium' | 'Low' | 'Idea';

export interface FeedbackItem {
  id: string;
  category: FeedbackCategory;
  userId: string;
  description: string;
  createdAt: string;
  resolved: boolean;
}

// Mock data for reviews and Q&A sections
export interface Review {
  id: string
  userName: string
  userInitial: string
  rating: number
  date: string
  headline: string
  body: string
  helpfulCount: number
  verifiedPurchase: boolean
}

export interface QnA {
  id: string
  question: string
  answer: string
  answeredBy: string
  answeredDate: string
}

export interface RatingDistribution {
  five: number
  four: number
  three: number
  two: number
  one: number
}

export const mockReviews: Review[] = [
  {
    id: '1',
    userName: 'Rajesh Kumar',
    userInitial: 'R',
    rating: 5,
    date: '2024-01-15',
    headline: 'Excellent phone with amazing camera',
    body: 'The camera quality is outstanding, especially in low light. The A17 Pro chip makes everything super smooth. Definitely worth the upgrade!',
    helpfulCount: 23,
    verifiedPurchase: true
  },
  {
    id: '2',
    userName: 'Priya Sharma',
    userInitial: 'P',
    rating: 4,
    date: '2024-01-10',
    headline: 'Great phone but expensive',
    body: 'Love the titanium build and the battery life is impressive. The price is steep but the quality justifies it.',
    helpfulCount: 15,
    verifiedPurchase: true
  },
  {
    id: '3',
    userName: 'Arjun Patel',
    userInitial: 'A',
    rating: 5,
    date: '2024-01-08',
    headline: 'Best iPhone yet!',
    body: 'The action button is so convenient and the overall performance is top-notch. Highly recommended for photography enthusiasts.',
    helpfulCount: 31,
    verifiedPurchase: true
  },
  {
    id: '4',
    userName: 'Sneha Reddy',
    userInitial: 'S',
    rating: 5,
    date: '2024-01-05',
    headline: 'Perfect for content creators',
    body: 'The video recording capabilities are incredible. The ProRAW photos are amazing for editing. Battery lasts all day with heavy usage.',
    helpfulCount: 28,
    verifiedPurchase: true
  },
  {
    id: '5',
    userName: 'Vikram Singh',
    userInitial: 'V',
    rating: 4,
    date: '2024-01-03',
    headline: 'Solid upgrade from previous model',
    body: 'The titanium design feels premium and the camera improvements are noticeable. Only complaint is the price, but you get what you pay for.',
    helpfulCount: 19,
    verifiedPurchase: true
  },
  {
    id: '6',
    userName: 'Anita Desai',
    userInitial: 'A',
    rating: 5,
    date: '2024-01-01',
    headline: 'Worth every penny',
    body: 'The build quality is exceptional and the performance is blazing fast. The new action button is surprisingly useful for shortcuts.',
    helpfulCount: 42,
    verifiedPurchase: true
  }
]

export const mockQnA: QnA[] = [
  {
    id: '1',
    question: 'What is the battery life of this device?',
    answer: 'The battery can last up to 18-24 hours with normal usage, depending on settings and usage patterns.',
    answeredBy: 'seller',
    answeredDate: '2 days ago'
  },
  {
    id: '2',
    question: 'Is this product compatible with existing accessories?',
    answer: 'Yes, it\'s compatible with most standard accessories. Please check the specifications for detailed compatibility information.',
    answeredBy: 'seller',
    answeredDate: '5 days ago'
  },
  {
    id: '3',
    question: 'Does it support wireless charging?',
    answer: 'Yes, the iPhone 15 Pro Max supports MagSafe wireless charging and standard Qi wireless charging.',
    answeredBy: 'seller',
    answeredDate: '1 week ago'
  },
  {
    id: '4',
    question: 'What is the warranty period?',
    answer: 'The device comes with 1 year Apple India Limited Warranty. Extended warranty options are available at purchase.',
    answeredBy: 'seller',
    answeredDate: '1 week ago'
  },
  {
    id: '5',
    question: 'Can I use this with my existing iPhone case?',
    answer: 'The iPhone 15 Pro Max has slightly different dimensions than previous models, so older cases may not fit perfectly. We recommend checking compatibility or purchasing a new case.',
    answeredBy: 'seller',
    answeredDate: '2 weeks ago'
  },
  {
    id: '6',
    question: 'Is the camera better than the previous model?',
    answer: 'Yes, the iPhone 15 Pro Max features significant camera improvements including a 48MP main camera, better low-light performance, and enhanced video recording capabilities.',
    answeredBy: 'seller',
    answeredDate: '2 weeks ago'
  }
]

export const mockRatingDistribution: RatingDistribution = {
  five: 1708,
  four: 711,
  three: 284,
  two: 85,
  one: 56
}

export const mockOverallRating = 4.6
export const mockTotalReviews = 2847

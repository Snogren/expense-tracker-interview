export interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
}

// Mix of receipt emails, order confirmations, and regular emails
const mockEmails: Email[] = [
  {
    id: '1',
    from: 'receipts@uber.com',
    subject: 'Your Uber receipt',
    date: '2025-01-28',
    body: `Thanks for riding with Uber!

Trip on January 28, 2025
From: 123 Main St
To: 456 Market St

Trip fare: $18.50
Service fee: $2.50
Total: $21.00

Payment: Visa ending in 4242

Thank you for choosing Uber!`,
  },
  {
    id: '2',
    from: 'newsletter@techcrunch.com',
    subject: 'TechCrunch Daily: Top Stories',
    date: '2025-01-28',
    body: `Good morning! Here are today's top tech stories:

1. Apple announces new product launch event
2. Startup raises $50M in Series B
3. New AI breakthrough in language models

Click here to read more...`,
  },
  {
    id: '3',
    from: 'order-confirm@amazon.com',
    subject: 'Your Amazon.com order #112-4567890',
    date: '2025-01-27',
    body: `Order Confirmation

Thank you for your order!

Order #112-4567890
Placed on January 27, 2025

Items:
- Sony WH-1000XM5 Headphones - $348.00
- USB-C Cable 3-pack - $12.99

Subtotal: $360.99
Shipping: FREE
Tax: $28.88
Order Total: $389.87

Shipping to: John Doe, 789 Oak Ave, San Francisco, CA 94102

Estimated delivery: January 30, 2025`,
  },
  {
    id: '4',
    from: 'noreply@spotify.com',
    subject: 'Your Spotify Premium receipt',
    date: '2025-01-25',
    body: `Spotify Premium Receipt

Hi John,

Thank you for your payment.

Plan: Spotify Premium Individual
Billing period: Jan 25, 2025 - Feb 24, 2025
Amount paid: $10.99

Payment method: Visa ending in 4242

Manage your subscription at spotify.com/account`,
  },
  {
    id: '5',
    from: 'updates@linkedin.com',
    subject: '5 people viewed your profile',
    date: '2025-01-25',
    body: `LinkedIn

Hi John,

Your profile was viewed by 5 people this week:
- Software Engineer at Google
- Recruiter at Meta
- Engineering Manager at Stripe

See who viewed your profile...`,
  },
  {
    id: '6',
    from: 'no-reply@doordash.com',
    subject: 'Your DoorDash order is confirmed!',
    date: '2025-01-24',
    body: `Your order from Chipotle is confirmed!

Order Details:
- Chicken Burrito Bowl - $10.95
- Chips & Guacamole - $4.25
- Large Drink - $2.85

Subtotal: $18.05
Delivery Fee: $3.99
Service Fee: $2.50
Tip: $5.00
Total: $29.54

Estimated delivery: 6:30 PM`,
  },
  {
    id: '7',
    from: 'team@slack.com',
    subject: 'Your weekly Slack digest',
    date: '2025-01-24',
    body: `Here's what you missed in Slack this week:

#general - 45 new messages
#engineering - 128 new messages
#random - 67 new messages

5 direct messages waiting for you

Open Slack to catch up!`,
  },
  {
    id: '8',
    from: 'receipt@starbucks.com',
    subject: 'Your Starbucks Receipt',
    date: '2025-01-23',
    body: `Thanks for visiting Starbucks!

Store #12345 - Market Street
January 23, 2025 at 8:32 AM

Grande Caramel Macchiato    $5.95
Blueberry Muffin            $3.45

Subtotal: $9.40
Tax: $0.75
Total: $10.15

Paid with Starbucks Card

You earned 42 Stars on this purchase!`,
  },
  {
    id: '9',
    from: 'billing@netflix.com',
    subject: 'Your Netflix receipt [January 2025]',
    date: '2025-01-22',
    body: `Netflix

Payment Receipt

Hi John,

We received your payment. Here are the details:

Plan: Standard
Billing Date: January 22, 2025
Amount: $15.49

Payment Method: Visa ending in 4242

Questions? Visit help.netflix.com`,
  },
  {
    id: '10',
    from: 'promotions@bestbuy.com',
    subject: 'Weekend Sale: Up to 50% off!',
    date: '2025-01-22',
    body: `BEST BUY

WEEKEND SALE EVENT!

Don't miss these deals:
- 50" Smart TV - Now $299 (was $449)
- iPad Air - $100 off
- Gaming laptops starting at $799

Shop now at bestbuy.com

Sale ends Sunday!`,
  },
];

export function getMockEmails(): Email[] {
  return mockEmails;
}

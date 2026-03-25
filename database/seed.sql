USE deals_platform;

INSERT INTO store_categories (category_name, sort_order) VALUES
  ('Supermarket', 1),
  ('Electronics', 2),
  ('Fashion', 3),
  ('Furniture', 4),
  ('Sports', 5),
  ('Home & Garden', 6);

INSERT INTO deal_categories (category_name, sort_order) VALUES
  ('Flash Deals', 1),
  ('Weekend Offers', 2),
  ('Black Friday Specials', 3),
  ('Clearance', 4),
  ('Buy One Get One', 5);

INSERT INTO subscription_plans
  (plan_name, description, price, duration_in_days, max_ads, max_deals, status)
VALUES
  ('Starter', 'Entry package for new vendors', 0.00, 30, 1, 10, 'active'),
  ('Growth', 'For stores promoting more deals and ads', 25.00, 30, 5, 50, 'active'),
  ('Premium', 'High visibility vendor package', 75.00, 30, 20, 250, 'active');

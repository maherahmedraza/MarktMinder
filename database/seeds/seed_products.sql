-- MarktMinder Seed Data
-- 10 Products with 30 days of price history

-- =====================================================
-- SEED PRODUCTS (Amazon Germany)
-- =====================================================

INSERT INTO products (id, marketplace, marketplace_id, marketplace_region, url, title, description, image_url, brand, category, current_price, currency, availability, lowest_price, highest_price, average_price, lowest_price_date, highest_price_date, last_scraped_at, created_at)
VALUES
-- Product 1: Apple AirPods Pro
('11111111-1111-1111-1111-111111111111', 'amazon', 'B0D1XD1ZV3', 'de', 
 'https://www.amazon.de/dp/B0D1XD1ZV3', 
 'Apple AirPods Pro (2. Generation) mit MagSafe Ladecase (USB-C)',
 'Die AirPods Pro wurden für eine noch individuellere Hörerfahrung entwickelt. Mit Aktiver Geräuschunterdrückung, Adaptivem Audio und 3D Audio mit dynamischem Head Tracking.',
 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
 'Apple', 'Kopfhörer', 229.00, 'EUR', 'in_stock',
 199.00, 279.00, 239.00, NOW() - INTERVAL '15 days', NOW() - INTERVAL '28 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 2: Sony WH-1000XM5
('22222222-2222-2222-2222-222222222222', 'amazon', 'B0BXYGLP4W', 'de',
 'https://www.amazon.de/dp/B0BXYGLP4W',
 'Sony WH-1000XM5 Noise Cancelling Wireless Headphones',
 'Branchenführende Geräuschunterdrückung mit 2 Prozessoren. 30 Stunden Akkulaufzeit mit Schnellladefunktion.',
 'https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg',
 'Sony', 'Kopfhörer', 295.00, 'EUR', 'in_stock',
 279.00, 379.00, 319.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '25 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 3: Samsung Galaxy S24 Ultra
('33333333-3333-3333-3333-333333333333', 'amazon', 'B0CMDLHGP3', 'de',
 'https://www.amazon.de/dp/B0CMDLHGP3',
 'Samsung Galaxy S24 Ultra 256GB Titanium Black',
 'Das ultimative Galaxy mit AI-Funktionen, 200 MP Kamera und S Pen. Titan-Design für maximale Haltbarkeit.',
 'https://m.media-amazon.com/images/I/71lSGpvXU0L._AC_SL1500_.jpg',
 'Samsung', 'Smartphones', 1149.00, 'EUR', 'in_stock',
 999.00, 1449.00, 1199.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 4: PlayStation 5 Slim
('44444444-4444-4444-4444-444444444444', 'amazon', 'B0CL5KNB9M', 'de',
 'https://www.amazon.de/dp/B0CL5KNB9M',
 'PlayStation 5 Slim Konsole - Digital Edition',
 'Die schlanke PS5 Digital Edition. Erlebe blitzschnelles Laden, haptisches Feedback und adaptiven Trigger.',
 'https://m.media-amazon.com/images/I/61So7t+ILOL._SL1500_.jpg',
 'Sony', 'Gaming', 399.00, 'EUR', 'in_stock',
 379.00, 449.00, 419.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '20 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 5: Dyson V15 Detect
('55555555-5555-5555-5555-555555555555', 'amazon', 'B09MVPBQX9', 'de',
 'https://www.amazon.de/dp/B09MVPBQX9',
 'Dyson V15 Detect Absolute Kabelloser Staubsauger',
 'Laser zeigt mikroskopischen Staub. Piezo-Sensor zählt und misst Partikel. LCD-Display zeigt wissenschaftliche Beweise.',
 'https://m.media-amazon.com/images/I/61sOuoSMEEL._AC_SL1500_.jpg',
 'Dyson', 'Staubsauger', 599.00, 'EUR', 'in_stock',
 549.00, 749.00, 649.00, NOW() - INTERVAL '7 days', NOW() - INTERVAL '30 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 6: LG OLED C3 55 Zoll
('66666666-6666-6666-6666-666666666666', 'amazon', 'B0BVXLQ9ZX', 'de',
 'https://www.amazon.de/dp/B0BVXLQ9ZX',
 'LG OLED55C39LA TV 139 cm (55 Zoll) OLED evo',
 'LG α9 Gen6 AI Prozessor mit AI Picture Pro & AI Sound Pro. 4K OLED evo mit selbstleuchtenden Pixeln.',
 'https://m.media-amazon.com/images/I/81T00PbLmhL._AC_SL1500_.jpg',
 'LG', 'Fernseher', 1099.00, 'EUR', 'in_stock',
 999.00, 1699.00, 1299.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 7: Nintendo Switch OLED
('77777777-7777-7777-7777-777777777777', 'amazon', 'B098RKWHHZ', 'de',
 'https://www.amazon.de/dp/B098RKWHHZ',
 'Nintendo Switch – OLED-Modell Weiss',
 '7-Zoll-OLED-Bildschirm mit lebendigen Farben und scharfem Kontrast. Breiter verstellbarer Aufsteller.',
 'https://m.media-amazon.com/images/I/61nqNujSF0L._SL1500_.jpg',
 'Nintendo', 'Gaming', 319.00, 'EUR', 'in_stock',
 289.00, 349.00, 319.00, NOW() - INTERVAL '12 days', NOW() - INTERVAL '25 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 8: De'Longhi Magnifica S
('88888888-8888-8888-8888-888888888888', 'amazon', 'B00GB6TPAU', 'de',
 'https://www.amazon.de/dp/B00GB6TPAU',
 'De''Longhi Magnifica S ECAM 22.110.B Kaffeevollautomat',
 'Einstellbare Kaffeestärke und Wassermenge. Integriertes Mahlwerk mit 13 Stufen. Milchaufschäumdüse.',
 'https://m.media-amazon.com/images/I/61j3sUvVoML._AC_SL1500_.jpg',
 'De''Longhi', 'Kaffee', 279.00, 'EUR', 'in_stock',
 249.00, 379.00, 299.00, NOW() - INTERVAL '8 days', NOW() - INTERVAL '22 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 9: Bose QuietComfort Ultra
('99999999-9999-9999-9999-999999999999', 'amazon', 'B0CD2FSRDD', 'de',
 'https://www.amazon.de/dp/B0CD2FSRDD',
 'Bose QuietComfort Ultra Headphones Kabellose Noise Cancelling Kopfhörer',
 'Weltklasse-Noise-Cancelling mit Immersive Audio für ein räumliches Klangerlebnis überall.',
 'https://m.media-amazon.com/images/I/61bVEoLuDRL._AC_SL1500_.jpg',
 'Bose', 'Kopfhörer', 379.00, 'EUR', 'in_stock',
 329.00, 449.00, 389.00, NOW() - INTERVAL '6 days', NOW() - INTERVAL '18 days',
 NOW(), NOW() - INTERVAL '30 days'),

-- Product 10: Kindle Paperwhite
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'amazon', 'B0CFPJYX7P', 'de',
 'https://www.amazon.de/dp/B0CFPJYX7P',
 'Kindle Paperwhite (16 GB) – Der icons Kindle mit 6,8-Zoll-Display',
 '6,8 Zoll Display mit Paperwhite-Technologie. Wochenlange Akkulaufzeit. Wasserfest für sorgloses Lesen.',
 'https://m.media-amazon.com/images/I/61XYgJtMWYL._AC_SL1000_.jpg',
 'Amazon', 'E-Reader', 159.99, 'EUR', 'in_stock',
 129.99, 169.99, 149.99, NOW() - INTERVAL '14 days', NOW() - INTERVAL '26 days',
 NOW(), NOW() - INTERVAL '30 days')
ON CONFLICT (marketplace, marketplace_id, marketplace_region) DO NOTHING;

-- =====================================================
-- GENERATE 30 DAYS OF PRICE HISTORY
-- =====================================================

-- Function to generate price history with realistic fluctuations
DO $$
DECLARE
    product_record RECORD;
    day_offset INTEGER;
    base_price DECIMAL(12,2);
    price_variation DECIMAL(12,2);
    daily_price DECIMAL(12,2);
    trend_factor DECIMAL(5,3);
BEGIN
    -- Loop through each seeded product
    FOR product_record IN 
        SELECT id, current_price, lowest_price, highest_price 
        FROM products 
        WHERE id IN (
            '11111111-1111-1111-1111-111111111111',
            '22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333',
            '44444444-4444-4444-4444-444444444444',
            '55555555-5555-5555-5555-555555555555',
            '66666666-6666-6666-6666-666666666666',
            '77777777-7777-7777-7777-777777777777',
            '88888888-8888-8888-8888-888888888888',
            '99999999-9999-9999-9999-999999999999',
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        )
    LOOP
        base_price := (product_record.highest_price + product_record.lowest_price) / 2;
        price_variation := (product_record.highest_price - product_record.lowest_price) / 2;
        
        -- Generate 30 days of history (4 data points per day for more granularity)
        FOR day_offset IN 0..29 LOOP
            -- Create a trend: start high, dip in middle, current price at end
            IF day_offset < 10 THEN
                trend_factor := 0.3 + (random() * 0.4);  -- Higher prices early
            ELSIF day_offset < 20 THEN
                trend_factor := -0.2 + (random() * 0.4); -- Lower prices middle
            ELSE
                trend_factor := (product_record.current_price - base_price) / price_variation * 0.5;
            END IF;
            
            -- Morning price
            daily_price := base_price + (price_variation * trend_factor) + (random() - 0.5) * price_variation * 0.3;
            daily_price := GREATEST(product_record.lowest_price, LEAST(product_record.highest_price, daily_price));
            INSERT INTO price_history (time, product_id, price, currency, availability)
            VALUES (NOW() - (day_offset || ' days')::INTERVAL + INTERVAL '8 hours', product_record.id, ROUND(daily_price, 2), 'EUR', 'in_stock')
            ON CONFLICT DO NOTHING;
            
            -- Evening price (slight variation)
            daily_price := daily_price + (random() - 0.5) * price_variation * 0.1;
            daily_price := GREATEST(product_record.lowest_price, LEAST(product_record.highest_price, daily_price));
            INSERT INTO price_history (time, product_id, price, currency, availability)
            VALUES (NOW() - (day_offset || ' days')::INTERVAL + INTERVAL '20 hours', product_record.id, ROUND(daily_price, 2), 'EUR', 'in_stock')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Update products with accurate price stats from generated history
UPDATE products p
SET 
    lowest_price = (SELECT MIN(price) FROM price_history WHERE product_id = p.id),
    highest_price = (SELECT MAX(price) FROM price_history WHERE product_id = p.id),
    average_price = (SELECT ROUND(AVG(price), 2) FROM price_history WHERE product_id = p.id),
    lowest_price_date = (SELECT time FROM price_history WHERE product_id = p.id ORDER BY price ASC, time DESC LIMIT 1),
    highest_price_date = (SELECT time FROM price_history WHERE product_id = p.id ORDER BY price DESC, time DESC LIMIT 1)
WHERE p.id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- =====================================================
-- ADD DEMO USER TRACKING
-- =====================================================

-- Add products to first user found (or create admin user)
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Get the first user
    SELECT id INTO demo_user_id FROM users LIMIT 1;
    
    IF demo_user_id IS NOT NULL THEN
        -- Add all products to user's watchlist
        INSERT INTO user_products (user_id, product_id, is_favorite, added_at)
        SELECT demo_user_id, id, 
               CASE WHEN random() > 0.5 THEN TRUE ELSE FALSE END,
               NOW() - (random() * 30 || ' days')::INTERVAL
        FROM products
        WHERE id IN (
            '11111111-1111-1111-1111-111111111111',
            '22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333',
            '44444444-4444-4444-4444-444444444444',
            '55555555-5555-5555-5555-555555555555',
            '66666666-6666-6666-6666-666666666666',
            '77777777-7777-7777-7777-777777777777',
            '88888888-8888-8888-8888-888888888888',
            '99999999-9999-9999-9999-999999999999',
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        )
        ON CONFLICT (user_id, product_id) DO NOTHING;
        
        -- Add some alerts
        INSERT INTO alerts (user_id, product_id, alert_type, target_price, is_active)
        VALUES 
            (demo_user_id, '11111111-1111-1111-1111-111111111111', 'price_below', 199.00, TRUE),
            (demo_user_id, '33333333-3333-3333-3333-333333333333', 'price_below', 999.00, TRUE),
            (demo_user_id, '66666666-6666-6666-6666-666666666666', 'all_time_low', NULL, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Success message
SELECT 'Seed data inserted successfully!' as message,
       (SELECT COUNT(*) FROM products WHERE id IN (
           '11111111-1111-1111-1111-111111111111',
           '22222222-2222-2222-2222-222222222222',
           '33333333-3333-3333-3333-333333333333',
           '44444444-4444-4444-4444-444444444444',
           '55555555-5555-5555-5555-555555555555',
           '66666666-6666-6666-6666-666666666666',
           '77777777-7777-7777-7777-777777777777',
           '88888888-8888-8888-8888-888888888888',
           '99999999-9999-9999-9999-999999999999',
           'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       )) as products_count,
       (SELECT COUNT(*) FROM price_history WHERE product_id IN (
           '11111111-1111-1111-1111-111111111111',
           '22222222-2222-2222-2222-222222222222',
           '33333333-3333-3333-3333-333333333333',
           '44444444-4444-4444-4444-444444444444',
           '55555555-5555-5555-5555-555555555555',
           '66666666-6666-6666-6666-666666666666',
           '77777777-7777-7777-7777-777777777777',
           '88888888-8888-8888-8888-888888888888',
           '99999999-9999-9999-9999-999999999999',
           'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       )) as price_history_count;

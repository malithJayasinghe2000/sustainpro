-- Add code column to sps_events table
ALTER TABLE sps_events 
ADD COLUMN code VARCHAR(50) UNIQUE;

-- Generate codes for existing events
-- Format: SPS-EVT-001, SPS-EVT-002, etc.
DO $$
DECLARE
    event_record RECORD;
    event_counter INTEGER := 0;
    new_code VARCHAR(50);
BEGIN
    FOR event_record IN 
        SELECT id FROM sps_events ORDER BY created_at
    LOOP
        event_counter := event_counter + 1;
        new_code := 'SPS-EVT-' || LPAD(event_counter::TEXT, 3, '0');
        
        UPDATE sps_events 
        SET code = new_code 
        WHERE id = event_record.id;
    END LOOP;
END $$;

-- Verify
SELECT code, name FROM sps_events ORDER BY code;

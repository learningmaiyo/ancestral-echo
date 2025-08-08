-- Reset any stuck personas from training status to pending
UPDATE personas SET voice_model_status = 'pending' WHERE voice_model_status = 'training';

-- Add a function to reset stuck voice cloning attempts (for future use)
CREATE OR REPLACE FUNCTION reset_stuck_voice_cloning()
RETURNS void AS $$
BEGIN
  UPDATE personas 
  SET voice_model_status = 'pending', 
      voice_samples_count = 0
  WHERE voice_model_status = 'training' 
    AND updated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
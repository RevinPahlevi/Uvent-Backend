-- Add user_id column to registrations table
-- This column is used to link registrations to the users table

ALTER TABLE registrations 
ADD COLUMN user_id INT NULL AFTER event_id,
ADD CONSTRAINT fk_registration_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_registrations_user_id ON registrations(user_id);

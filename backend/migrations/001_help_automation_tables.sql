-- Help Automation Tables Migration
-- PostgreSQL compatible
-- Run this after initial TaskMap schema setup

-- Create help_automation_methods table
CREATE TABLE IF NOT EXISTS help_automation_methods (
    id VARCHAR(36) PRIMARY KEY,
    method_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by VARCHAR(50) NOT NULL DEFAULT '1',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on method_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_help_automation_methods_method_name
ON help_automation_methods(method_name);

-- Create index on created_by for multi-user support
CREATE INDEX IF NOT EXISTS idx_help_automation_methods_created_by
ON help_automation_methods(created_by);

-- Create help_automation_steps table
CREATE TABLE IF NOT EXISTS help_automation_steps (
    id VARCHAR(36) PRIMARY KEY,
    method_id VARCHAR(36) NOT NULL,
    step_order INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target TEXT NOT NULL,
    step_metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_method
        FOREIGN KEY (method_id)
        REFERENCES help_automation_methods(id)
        ON DELETE CASCADE
);

-- Create index on method_id for faster joins
CREATE INDEX IF NOT EXISTS idx_help_automation_steps_method_id
ON help_automation_steps(method_id);

-- Create index on step_order for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_help_automation_steps_step_order
ON help_automation_steps(method_id, step_order);

-- Create composite index for efficient ordered queries
CREATE INDEX IF NOT EXISTS idx_help_automation_steps_method_order
ON help_automation_steps(method_id, step_order);

-- Add comments for documentation
COMMENT ON TABLE help_automation_methods IS 'Stores named automation methods that can be called by the Help Bot';
COMMENT ON TABLE help_automation_steps IS 'Individual steps within an automation method, ordered by step_order';

COMMENT ON COLUMN help_automation_methods.method_name IS 'Unique identifier for the method (e.g., how_to_analyze_tasks)';
COMMENT ON COLUMN help_automation_methods.description IS 'Optional description used for query matching';
COMMENT ON COLUMN help_automation_methods.created_by IS 'User ID who created this method';

COMMENT ON COLUMN help_automation_steps.step_order IS 'Execution order (0-indexed)';
COMMENT ON COLUMN help_automation_steps.action_type IS 'Type of action: BUTTON_CLICK, TAB_OPEN, VIEW_CHANGE, etc.';
COMMENT ON COLUMN help_automation_steps.target IS 'Target element label or name';
COMMENT ON COLUMN help_automation_steps.step_metadata IS 'Additional context as JSON (selector, route, etc.)';

-- Optional: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_automation_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create trigger for auto-updating updated_at
CREATE TRIGGER trigger_help_automation_methods_updated_at
    BEFORE UPDATE ON help_automation_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_help_automation_methods_updated_at();

-- Sample data (optional - for testing)
-- Uncomment to insert sample automation method

-- INSERT INTO help_automation_methods (id, method_name, description, created_by)
-- VALUES (
--     'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
--     'how_to_view_kanban',
--     'How to switch to Kanban board view',
--     '1'
-- );

-- INSERT INTO help_automation_steps (id, method_id, step_order, action_type, target, step_metadata)
-- VALUES
--     (
--         'step-001',
--         'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
--         0,
--         'BUTTON_CLICK',
--         'Kanban View',
--         '{"selector": "#kanban-view-btn", "view": "kanban"}'::jsonb
--     ),
--     (
--         'step-002',
--         'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
--         1,
--         'VIEW_CHANGE',
--         'Kanban Board',
--         '{"selector": ".kanban-board", "view": "kanban"}'::jsonb
--     );

-- Verify tables created
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name IN ('help_automation_methods', 'help_automation_steps')
ORDER BY table_name;

-- Verify indexes created
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE tablename IN ('help_automation_methods', 'help_automation_steps')
ORDER BY tablename, indexname;

-- Show table structures
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('help_automation_methods', 'help_automation_steps')
ORDER BY table_name, ordinal_position;

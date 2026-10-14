-- CivicQueue Relational Database Schema (PostgreSQL-compatible)
-- Supports persistent storage, high-throughput queuing, and compliance audit logs.

-- 1. Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    prefix VARCHAR(5) NOT NULL,
    description TEXT,
    base_duration_sec INT NOT NULL DEFAULT 120,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Service Counters
CREATE TABLE IF NOT EXISTS service_counters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category_specialty VARCHAR(10) DEFAULT 'ALL',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PAUSED')),
    current_mu DOUBLE PRECISION NOT NULL DEFAULT 0.00833, -- EWMA throughput rate in tokens/sec
    avg_service_sec INT NOT NULL DEFAULT 120,
    total_completed_count INT NOT NULL DEFAULT 0,
    total_duration_sec BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tokens / Queue Tickets
CREATE TABLE IF NOT EXISTS queue_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number VARCHAR(20) NOT NULL UNIQUE,
    service_type VARCHAR(10) NOT NULL REFERENCES service_categories(id),
    citizen_name VARCHAR(150),
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' 
        CHECK (status IN ('WAITING', 'APPROACHING', 'SERVING', 'COMPLETED', 'CANCELLED')),
    queue_position INT,
    serving_counter_id INT REFERENCES service_counters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_wait_duration_sec INT,
    actual_service_duration_sec INT
);

-- 4. Counter Service History & EWMA Audit Log
CREATE TABLE IF NOT EXISTS counter_service_logs (
    id BIGSERIAL PRIMARY KEY,
    counter_id INT NOT NULL REFERENCES service_counters(id),
    token_id UUID NOT NULL REFERENCES queue_tokens(id),
    service_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    service_ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_sec INT NOT NULL,
    previous_mu DOUBLE PRECISION NOT NULL,
    updated_mu DOUBLE PRECISION NOT NULL,
    alpha_used DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Counter State Transition Audit (Open/Close Events)
CREATE TABLE IF NOT EXISTS counter_state_events (
    id BIGSERIAL PRIMARY KEY,
    counter_id INT NOT NULL REFERENCES service_counters(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('OPEN', 'CLOSE', 'CALL_NEXT', 'PREEMPT_RETURN')),
    affected_token_id UUID REFERENCES queue_tokens(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tokens_status ON queue_tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON queue_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_tokens_service_type ON queue_tokens(service_type);
CREATE INDEX IF NOT EXISTS idx_service_logs_counter ON counter_service_logs(counter_id);

-- Initial seed data for service categories
INSERT INTO service_categories (id, name, prefix, description, base_duration_sec)
VALUES 
    ('GEN', 'General Inquiries', 'GEN', 'Civic information, form submission & general intake', 90),
    ('DOC', 'Document Attestation', 'DOC', 'Certifications, notary verifications & official apostilles', 150),
    ('CSH', 'Cashier & Payments', 'CSH', 'Municipal fee payments, utility bills & receipts', 75),
    ('LIC', 'Permits & Licensing', 'LIC', 'Business permits, building registrations & trade licenses', 180),
    ('PRI', 'Priority & Accessibility', 'PRI', 'Senior citizens, persons with disabilities & urgent civic cases', 100)
ON CONFLICT (id) DO NOTHING;

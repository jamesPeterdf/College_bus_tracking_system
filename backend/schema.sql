-- COBUS Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students Table
CREATE TABLE Students (
    student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    parent_phone VARCHAR(20) NOT NULL,
    parent_email VARCHAR(255),
    parent_whatsapp VARCHAR(20),
    department VARCHAR(100),
    semester INTEGER,
    year INTEGER,
    route_id UUID,
    stop_id UUID,
    profile_photo TEXT,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drivers Table
CREATE TABLE Drivers (
    driver_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    bus_id UUID,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    current_latitude DECIMAL(9,6),
    current_longitude DECIMAL(9,6),
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Buses Table
CREATE TABLE Buses (
    bus_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    route_id UUID,
    driver_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Routes Table
CREATE TABLE Routes (
    route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(100) NOT NULL,
    route_code VARCHAR(50) UNIQUE NOT NULL,
    total_distance_km DECIMAL(5,2),
    estimated_duration_min INTEGER,
    departure_time TIME,
    return_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stops Table
CREATE TABLE Stops (
    stop_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES Routes(route_id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    stop_order INTEGER NOT NULL,
    estimated_arrival_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE Attendance (
    attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES Students(student_id),
    driver_id UUID REFERENCES Drivers(driver_id),
    route_id UUID REFERENCES Routes(route_id),
    date DATE DEFAULT CURRENT_DATE,
    boarded_at TIMESTAMP WITH TIME ZONE,
    deboarded_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'absent', -- present, absent, late
    notified_parent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE Notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_type VARCHAR(50) NOT NULL, -- student, driver, admin
    recipient_id UUID NOT NULL,
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    channel VARCHAR(50), -- push, sms, whatsapp
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- Audit Log Table
CREATE TABLE AuditLogs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(100),
    target_id UUID,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_student_roll ON Students(roll_number);
CREATE INDEX idx_driver_code ON Drivers(driver_code);
CREATE INDEX idx_bus_vehicle ON Buses(vehicle_number);
CREATE INDEX idx_route_code ON Routes(route_code);
CREATE INDEX idx_attendance_date ON Attendance(date);
CREATE INDEX idx_notification_recipient ON Notifications(recipient_id);

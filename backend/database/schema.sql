-- ============================================================
-- LEGACY CRM - DATABASE SCHEMA
-- MariaDB | Port 3307 | Database: legacy
-- ============================================================

USE legacy;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. USERS (assessores do CRM)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','assessor') DEFAULT 'assessor',
    avatar_url VARCHAR(500) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. FUNNELS (funis de atendimento)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(50) DEFAULT '#C89B3C',
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. STAGES (estágios do pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_order INT DEFAULT 0,
    color VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. LEADS (clientes/casos)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    cpf VARCHAR(14) DEFAULT NULL,
    origin ENUM('whatsapp','manual','instagram','site') DEFAULT 'whatsapp',
    funnel_id INT NOT NULL,
    stage_id INT NOT NULL,
    assigned_to INT DEFAULT NULL,
    status ENUM('active','approved','rejected','archived') DEFAULT 'active',
    description TEXT DEFAULT NULL,
    verdict_notes TEXT DEFAULT NULL,
    whatsapp_id VARCHAR(100) DEFAULT NULL UNIQUE,
    bot_active TINYINT(1) DEFAULT 1,
    bot_session_id VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE RESTRICT,
    FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leads_phone (phone),
    INDEX idx_leads_funnel (funnel_id),
    INDEX idx_leads_stage (stage_id),
    INDEX idx_leads_status (status),
    INDEX idx_leads_whatsapp_id (whatsapp_id)
);

-- ============================================================
-- 5. CONVERSATIONS (conversas do WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    whatsapp_chat_id VARCHAR(100) NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count INT DEFAULT 0,
    status ENUM('open','in_progress','resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_conv_lead (lead_id),
    INDEX idx_conv_whatsapp (whatsapp_chat_id)
);

-- ============================================================
-- 6. MESSAGES (mensagens individuais)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    lead_id INT NOT NULL,
    content TEXT NOT NULL,
    media_url VARCHAR(500) DEFAULT NULL,
    media_type ENUM('image','video','audio','document') DEFAULT NULL,
    direction ENUM('inbound','outbound') NOT NULL,
    sender ENUM('lead','bot','assessor') DEFAULT 'lead',
    sender_user_id INT DEFAULT NULL,
    whatsapp_message_id VARCHAR(100) DEFAULT NULL UNIQUE,
    is_read TINYINT(1) DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_msg_conversation (conversation_id),
    INDEX idx_msg_sent_at (sent_at)
);

-- ============================================================
-- 7. TASKS (tarefas vinculadas a leads)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    created_by INT NOT NULL,
    assigned_to INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    category ENUM('ligacao','documento','reuniao','prazo','outro') DEFAULT 'outro',
    priority ENUM('alta','media','baixa') DEFAULT 'media',
    status ENUM('pendente','em_andamento','concluida') DEFAULT 'pendente',
    due_date DATE DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tasks_lead (lead_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_due_date (due_date),
    INDEX idx_tasks_priority (priority)
);

-- ============================================================
-- 8. DOCUMENTS (documentos dos leads)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    uploaded_by INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) DEFAULT NULL,
    file_url VARCHAR(500) DEFAULT NULL,
    file_size_kb INT DEFAULT NULL,
    status ENUM('pendente','recebido','aprovado','rejeitado') DEFAULT 'pendente',
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_docs_lead (lead_id)
);

-- ============================================================
-- 9. NOTES (anotações manuais e do bot)
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    author_type ENUM('user','bot') DEFAULT 'user',
    author_user_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_notes_lead (lead_id)
);

-- ============================================================
-- 10. BOT_SESSIONS (estado da conversa com o bot de IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    session_token VARCHAR(100) NOT NULL UNIQUE,
    step ENUM('greeting','identify_topic','collect_info','submit','done') DEFAULT 'greeting',
    collected_data JSON DEFAULT NULL,
    ai_context JSON DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- ============================================================
-- 11. ACTIVITY_LOG (auditoria de todas as ações)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    lead_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    old_value JSON DEFAULT NULL,
    new_value JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    INDEX idx_log_user (user_id),
    INDEX idx_log_lead (lead_id),
    INDEX idx_log_created (created_at)
);

SET FOREIGN_KEY_CHECKS = 1;

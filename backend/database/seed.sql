-- ============================================================
-- LEGACY CRM - SEED DATA
-- ============================================================

USE legacy;

-- ============================================================
-- FUNNELS (área de atuação)
-- ============================================================
INSERT IGNORE INTO funnels (name, slug, color, description, display_order) VALUES
('Trabalhista', 'trabalhista', 'hsl(43 72% 49%)', 'Rescisão indireta, insalubridade, horas extras e demais direitos trabalhistas', 1),
('Cível / Consumidor', 'civel', 'hsl(20 80% 55%)', 'Limpeza de nome, negativação indevida, cobranças abusivas e danos morais', 2),
('Golpes Cibernéticos', 'golpe-cibernetico', 'hsl(200 70% 50%)', 'Recuperação de contas hackeadas (Instagram, Facebook, WhatsApp) e indenização por danos morais', 3),
('Golpe do Pix', 'golpe-pix', 'hsl(0 65% 55%)', 'Recuperação de valores perdidos em golpes do Pix e indenização por danos morais', 4);

-- ============================================================
-- STAGES (etapas do pipeline)
-- ============================================================
INSERT IGNORE INTO stages (name, slug, display_order) VALUES
('Recebido', 'recebido', 1),
('Qualificação', 'qualificacao', 2),
('Análise', 'analise', 3),
('Documentação', 'documentacao', 4),
('Assinatura', 'assinatura', 5),
('Finalizado', 'finalizado', 6);

-- ============================================================
-- ADMIN USER (senha: admin123 - hash bcrypt)
-- ============================================================
INSERT IGNORE INTO users (name, email, password_hash, role) VALUES
('Administrador Legacy', 'admin@legacy.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- Nota: '$2b$10$...' é o hash bcrypt de 'password'
-- Para produção: trocar pela senha real usando bcrypt.hash('sua_senha', 10)

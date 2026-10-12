-- Zero-Data Baseline Reset
DELETE FROM channel_snapshots;
DELETE FROM content_items;
SELECT setval('content_items_id_seq', 1, false);
DELETE FROM migration_history;
DELETE FROM user_login_logs;
DELETE FROM audit_logs;
DELETE FROM channels;
INSERT INTO channels (id, name, handle, channel_url, author_name, subscriber_count, video_count, total_views, is_default)
VALUES ('c0000000-0000-0000-0000-000000000001', 'Main Studio Channel', '@MainStudio', 'https://www.youtube.com/@MainStudio', 'Studio Admin', 0, 0, 0, TRUE)
ON CONFLICT (id) DO NOTHING;

DELETE FROM users WHERE username != 'admin';

UPDATE users 
SET role = 'admin', 
    permissions = '["can_view_content","can_manage_content","can_manage_users","can_manage_settings","can_view_audit_logs","can_export_data","can_migrate_data"]'::jsonb, 
    is_active = TRUE 
WHERE username = 'admin';

INSERT INTO audit_logs (username, action, entity, entity_id, details)
VALUES ('admin', 'SYSTEM_RESET', 'system', 'system', '{"message": "Clean single-admin zero-data baseline established"}');

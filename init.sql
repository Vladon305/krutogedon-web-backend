-- Создаем пользователя, если его нет
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'krutagidon') THEN
        CREATE ROLE krutagidon LOGIN PASSWORD 'secretpassword';
        ALTER ROLE krutagidon CREATEDB;
    END IF;
END
$$;

-- Создаем БД, если её нет
CREATE DATABASE krutagidon_db OWNER krutagidon;
GRANT ALL PRIVILEGES ON DATABASE krutagidon_db TO krutagidon;
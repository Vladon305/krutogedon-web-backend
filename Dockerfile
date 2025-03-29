# Этап 1: Сборка зависимостей и компиляция проекта
FROM node:20 AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем зависимости для компиляции bcrypt
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код проекта
COPY . .

# Собираем проект
RUN npm run build

# Этап 2: Финальный образ для разработки
FROM node:20-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем скомпилированный код и зависимости
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Указываем команду для запуска в режиме разработки
CMD ["npm", "run", "start:dev"]

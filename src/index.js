require('dotenv').config(); // Нужно только для локальной разработки. Railway игнорирует этот файл.

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
// Railway автоматически задаёт PORT. Локально будет использоваться 3000.
const PORT = process.env.PORT || 3000;

// === 1. Middleware ===
app.use(cors());
app.use(express.json());

// === 2. Инициализация Supabase ===
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ОШИБКА: Отсутствуют SUPABASE_URL или SUPABASE_KEY в переменных окружения');
  console.error('💡 На Railway: Settings → Variables → Добавьте SUPABASE_URL и SUPABASE_KEY');
  process.exit(1); // Останавливаем запуск, чтобы не было бесконечного цикла ошибок
}

const supabase = createClient(supabaseUrl, supabaseKey);

// === 3. Маршруты ===
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: supabaseUrl ? 'connected' : 'missing'
  });
});

app.get('/api/receipts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Supabase error (receipts):', err.message);
    res.status(500).json({ error: 'Не удалось загрузить чеки', details: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if ((username === 'admin' && password === 'admin123') || 
      (username === 'user' && password === 'user123')) {
    return res.json({
      success: true,
      token: 'node-jwt-token-12345',
      user: { username, role: username, id: username === 'admin' ? 1 : 2 }
    });
  }

  res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

// Обработчик 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// === 4. Запуск сервера ===
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
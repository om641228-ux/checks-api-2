require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
  console.error('💡 On Railway: Settings → Variables → Add SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// URL для хранилища Supabase (для фото чеков)
const STORAGE_URL = 'https://sxweyznuzkmc...supabase.co/storage/v1/object/public/tool-images';

// Helper функция для добавления полного URL к изображениям
const addFullImageUrls = (receipts) => {
  return receipts.map(receipt => ({
    ...receipt,
    fullImageUrl: receipt.image_url 
      ? `${STORAGE_URL}${receipt.image_url.replace('/uploads', '/uploads')}`
      : null
  }));
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: supabaseUrl ? 'connected' : 'missing'
  });
});

// GET all receipts with full image URLs
app.get('/api/receipts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Добавляем полные URL для изображений
    const receiptsWithImages = addFullImageUrls(data || []);
    
    console.log(`✅ Retrieved ${receiptsWithImages.length} receipts`);
    res.json(receiptsWithImages);
  } catch (err) {
    console.error('Error fetching receipts:', err.message);
    res.status(500).json({ 
      error: 'Не удалось загрузить чеки', 
      details: err.message 
    });
  }
});

// GET receipt by ID
app.get('/api/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Добавляем полный URL для изображения
    const receiptWithImage = {
      ...data,
      fullImageUrl: data.image_url 
        ? `${STORAGE_URL}${data.image_url}`
        : null
    };

    res.json(receiptWithImage);
  } catch (err) {
    console.error('Error fetching receipt:', err.message);
    res.status(500).json({ 
      error: 'Не удалось загрузить чек', 
      details: err.message 
    });
  }
});

// POST - create new receipt
app.post('/api/receipts', async (req, res) => {
  try {
    const receiptData = req.body;
    
    const { data, error } = await supabase
      .from('receipts')
      .insert([receiptData])
      .select();

    if (error) throw error;

    // Добавляем полный URL для изображения
    const newReceipt = {
      ...data[0],
      fullImageUrl: data[0].image_url 
        ? `${STORAGE_URL}${data[0].image_url}`
        : null
    };

    res.status(201).json(newReceipt);
  } catch (err) {
    console.error('Error creating receipt:', err.message);
    res.status(500).json({ 
      error: 'Не удалось создать чек', 
      details: err.message 
    });
  }
});

// PUT - update receipt
app.put('/api/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data, error } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Добавляем полный URL для изображения
    const updatedReceipt = {
      ...data[0],
      fullImageUrl: data[0].image_url 
        ? `${STORAGE_URL}${data[0].image_url}`
        : null
    };

    res.json(updatedReceipt);
  } catch (err) {
    console.error('Error updating receipt:', err.message);
    res.status(500).json({ 
      error: 'Не удалось обновить чек', 
      details: err.message 
    });
  }
});

// DELETE - delete receipt
app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Receipt deleted successfully' });
  } catch (err) {
    console.error('Error deleting receipt:', err.message);
    res.status(500).json({ 
      error: 'Не удалось удалить чек', 
      details: err.message 
    });
  }
});

// Auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Simple auth (replace with your actual auth logic)
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'user' && password === 'user123')) {
    return res.json({
      success: true,
      token: 'node-jwt-token-12345',
      user: { 
        username, 
        role: username, 
        id: username === 'admin' ? 1 : 2 
      }
    });
  }

  res.status(401).json({ 
    success: false, 
    message: 'Неверный логин или пароль' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Receipts API: http://localhost:${PORT}/api/receipts`);
  console.log(`💾 Storage URL: ${STORAGE_URL}`);
});

module.exports = app;
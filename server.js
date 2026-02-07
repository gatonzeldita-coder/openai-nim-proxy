// server.js - OpenAI to NVIDIA NIM API Proxy
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const NIM_API_BASE = 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY;

// Model Mapping: Mapping 'gpt-4o' to DeepSeek V3.1
const MODEL_MAPPING = {
  'gpt-4o': 'deepseek-ai/deepseek-v3.1',
  'gpt-3.5-turbo': 'meta/llama-3.1-8b-instruct'
};

// Health Check (To verify the proxy is alive)
app.get('/', (req, res) => {
  res.status(200).json({ status: "Online", message: "Use this URL in Janitor AI" });
});

// The Main Route (Handles Janitor requests)
app.post(['/v1/chat/completions', '/chat/completions'], async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens, stream } = req.body;
    
    // Switch to NVIDIA model name
    const nimModel = MODEL_MAPPING[model] || model;

    const response = await axios.post(`${NIM_API_BASE}/chat/completions`, {
      model: nimModel,
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4096,
      stream: stream || false
    }, {
      headers: {
        'Authorization': `Bearer ${NIM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: stream ? 'stream' : 'json',
      // Standard timeout for Vercel functions (10s)
      timeout: 9500 
    });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      response.data.pipe(res);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('NIM Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Internal Proxy Error"
    });
  }
});

// CRITICAL FOR VERCEL: Export the app instead of using app.listen
module.exports = app;
